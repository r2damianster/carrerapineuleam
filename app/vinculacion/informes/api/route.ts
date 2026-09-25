import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeSupervisarVinculacion, puedeGestionarVinculacion } from '@/lib/modulos';
import { datosInformeLider } from '@/lib/informesVinculacion';
import { generarInformeSupervisorDesdePlantilla } from '../_lib/plantillaSupervisor';
import { pedirCompletionIA, formatearErrorIA } from '@/app/utilidades/_lib/groq';
import { datosInformeSupervisor, recopilarSenalesObstaculos } from '@/lib/informeSupervisorTareas';
import { generarDocxLider } from '../_lib/docxLider';
import {
  generarGraficoPasantesHoras,
  generarGraficoGenero,
  generarGraficoEvolucionMensual,
  generarGraficoPlanVsEjecutado,
} from '../_lib/graficos';

/** Informe del supervisor: plantilla institucional + gráficos de participación. */
async function generarBufferSupervisor(datos: any): Promise<Buffer> {
  const pasantesParaGrafico = (datos.participacion?.pasantes || []).map((pasante: any) => ({
    nombre: `${pasante.nombres} ${pasante.apellidos}`,
    horas_mes: pasante.horas_periodo,
    horas_acumuladas: pasante.horas_periodo,
  }));
  const [graficoPasantes, graficoGenero] = await Promise.all([
    generarGraficoPasantesHoras(pasantesParaGrafico),
    generarGraficoGenero(datos.participacion?.genero || {}),
  ]);
  return generarInformeSupervisorDesdePlantilla(datos, { pasantes: graficoPasantes, genero: graficoGenero });
}

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || (!puedeSupervisarVinculacion(usuario) && !puedeGestionarVinculacion(usuario))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accion = searchParams.get('accion') || 'datos';
    const tipo = searchParams.get('tipo') || 'supervisor';
    const mes = searchParams.get('mes') || new Date().toISOString().slice(0, 7);
    // Las columnas `mes` de Neon son tipo date: 'YYYY-MM' se normaliza al primer día.
    const mesFecha = /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : mes;
    const cicloIdParam = searchParams.get('ciclo_id');
    const supervisorIdParam = searchParams.get('supervisor_id');

    const sql = neon(process.env.DATABASE_URL!);

    if (accion === 'datos') {
      if (tipo === 'supervisor') {
        let targetSupervisorId = Number(usuario.id);
        if (supervisorIdParam && puedeGestionarVinculacion(usuario)) {
          targetSupervisorId = parseInt(supervisorIdParam);
        }
        const datos = await datosInformeSupervisor(sql, { supervisorId: targetSupervisorId, mes });
        return NextResponse.json({ success: true, datos });
      }

      if (tipo === 'lider') {
        if (!puedeGestionarVinculacion(usuario)) {
          return NextResponse.json({ error: 'Solo el Líder de proyecto puede ver el informe semestral' }, { status: 403 });
        }
        let cicloId = cicloIdParam ? parseInt(cicloIdParam) : null;
        if (!cicloId) {
          const [cicloActivo] = await sql`SELECT id FROM ciclos_academicos ORDER BY id DESC LIMIT 1`;
          cicloId = cicloActivo?.id || 1;
        }
        const datos = await datosInformeLider(sql, { cicloId: cicloId! });
        return NextResponse.json({ success: true, datos });
      }
    }

    if (accion === 'historial') {
      const historial = puedeGestionarVinculacion(usuario)
        ? await sql`
            SELECT i.id, i.tipo, i.mes, i.creado_en, c.nombre AS ciclo_nombre, u.nombres AS supervisor_nombres, u.apellidos AS supervisor_apellidos
            FROM informes_vinculacion i
            LEFT JOIN ciclos_academicos c ON i.ciclo_id = c.id
            LEFT JOIN usuarios u ON i.supervisor_id = u.id
            ORDER BY i.creado_en DESC
          `
        : await sql`
            SELECT i.id, i.tipo, i.mes, i.creado_en, c.nombre AS ciclo_nombre
            FROM informes_vinculacion i
            LEFT JOIN ciclos_academicos c ON i.ciclo_id = c.id
            WHERE i.supervisor_id = ${Number(usuario.id)}
            ORDER BY i.creado_en DESC
          `;
      return NextResponse.json({ success: true, historial });
    }

    if (accion === 'obstaculos') {
      const obstaculos = await sql`
        SELECT id, supervisor_id, mes, restriccion AS descripcion, accion_correctiva AS recomendacion, impacto
        FROM supervision_obstaculos
        WHERE supervisor_id = ${Number(usuario.id)} AND mes = ${mesFecha}
        ORDER BY id ASC
      `;
      return NextResponse.json({ success: true, obstaculos });
    }

    if (accion === 'descargar') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Se requiere id de informe' }, { status: 400 });

      const [informe] = await sql`SELECT * FROM informes_vinculacion WHERE id = ${parseInt(id)}`;
      if (!informe) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 });

      const datos = informe.datos_json;
      let buffer: Buffer;

      if (informe.tipo === 'supervisor') {
        buffer = await generarBufferSupervisor(datos);
      } else {
        const [gEvolucion, gPlanVsEj] = await Promise.all([
          generarGraficoEvolucionMensual(datos.evolucion || []),
          generarGraficoPlanVsEjecutado(datos.metas || {}),
        ]);
        buffer = await generarDocxLider(datos, { evolucion: gEvolucion, planVsEjecutado: gPlanVsEj });
      }

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename=Informe_${informe.tipo}_${informe.mes || 'semestral'}.docx`,
        },
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || (!puedeSupervisarVinculacion(usuario) && !puedeGestionarVinculacion(usuario))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const body = await request.json();
    const { accion } = body;

    if (accion === 'redactar-todo') {
      const { mes: mesBody, supervisor_id: supervisorIdBody, forzar } = body;
      const mes = String(mesBody || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ error: 'Mes inválido' }, { status: 400 });
      const supervisorId = supervisorIdBody && puedeGestionarVinculacion(usuario) ? Number(supervisorIdBody) : Number(usuario.id);
      const mesFecha = `${mes}-01`;

      const datos = await datosInformeSupervisor(sql, { supervisorId, mes });
      const senales = await recopilarSenalesObstaculos(sql, supervisorId, mes);
      const existentes = await sql`SELECT id FROM supervision_obstaculos WHERE supervisor_id = ${supervisorId} AND mes = ${mesFecha}::date`;
      const necesitaObstaculos = forzar ? true : existentes.length === 0;
      const tareasConActividad = datos.tareas.filter((tarea: any) => (tarea.realizado ?? 0) > 0 || tarea.observaciones);

      const resumenTareas = tareasConActividad.map((tarea: any) => ({
        codigo: tarea.codigo,
        tarea: tarea.nombre,
        meta: `${tarea.meta ?? 'sin meta'} ${tarea.unidad}`,
        realizado: tarea.realizado ?? 0,
        estudiantes: tarea.alumnos,
        registros: tarea.observaciones,
      }));
      const indicaciones =
        'Eres un docente supervisor de un proyecto de vinculación con la sociedad de una universidad ecuatoriana. Redactas con tono formal, en español, usando SOLO los datos dados (no inventes cifras, nombres ni lugares, sin placeholders entre corchetes).';
      const pedido =
        `Periodo: ${datos.periodo.etiquetaPeriodo}, corte a ${datos.periodo.etiqueta}.\n` +
        `TAREAS CON ACTIVIDAD: ${JSON.stringify(resumenTareas)}\n` +
        `SEÑALES DEL PERIODO: ${JSON.stringify(senales)}\n\n` +
        'Devuelve SOLO un JSON con esta forma: {"tareas":[{"codigo":"1.1","productos_sociales":"...","productos_academicos":"..."}],"obstaculos":[{"descripcion":"...","recomendacion":"..."}]}.\n' +
        'productos_sociales = beneficio para la comunidad y los beneficiarios; productos_academicos = aprendizajes o evidencias para los estudiantes universitarios; máx. 40 palabras cada uno, una entrada por cada tarea con actividad.\n' +
        (necesitaObstaculos
          ? 'obstaculos: de 1 a 3 restricciones con su acción correctiva. Primero deduce las restricciones de las observaciones existentes (SEÑALES.observaciones). Si no hay observaciones, infiere restricciones razonables a partir de los datos (sesiones pendientes o rechazadas, tareas sin registros o con bajo avance frente a su meta) y redáctalas como riesgos reales del periodo, sin afirmar hechos que los datos no respalden.'
          : 'obstaculos: devuelve una lista vacía.');
      try {
        const respuesta = await pedirCompletionIA(
          [{ role: 'system', content: indicaciones }, { role: 'user', content: pedido }],
          { temperature: 0.3, responseFormatJson: true }
        );
        const resultado = JSON.parse(respuesta);
        const obstaculosNuevos: any[] = [];
        if (necesitaObstaculos) {
          if (forzar && existentes.length) await sql`DELETE FROM supervision_obstaculos WHERE supervisor_id = ${supervisorId} AND mes = ${mesFecha}::date`;
          for (const obstaculo of (resultado.obstaculos || []).slice(0, 3)) {
            if (!obstaculo?.descripcion) continue;
            const [fila] = await sql`
              INSERT INTO supervision_obstaculos (supervisor_id, mes, restriccion, impacto, accion_correctiva)
              VALUES (${supervisorId}, ${mesFecha}::date, ${String(obstaculo.descripcion)}, 'medio', ${obstaculo.recomendacion ? String(obstaculo.recomendacion) : null})
              RETURNING id, supervisor_id, mes, restriccion AS descripcion, accion_correctiva AS recomendacion, impacto
            `;
            obstaculosNuevos.push(fila);
          }
        }
        return NextResponse.json({ success: true, tareas: resultado.tareas || [], obstaculos: obstaculosNuevos });
      } catch (error) {
        return NextResponse.json({ error: formatearErrorIA(error) }, { status: 500 });
      }
    }

    if (accion === 'guardar-no-prevista') {
      const { mes: mesBody, tarea, avance, alumnos, productos_sociales, productos_academicos, observaciones } = body;
      const mesFecha = /^\d{4}-\d{2}$/.test(mesBody || '') ? `${mesBody}-01` : mesBody;
      if (!mesFecha || !String(tarea || '').trim()) {
        return NextResponse.json({ error: 'Mes y tarea son requeridos' }, { status: 400 });
      }
      const [nueva] = await sql`
        INSERT INTO informe_no_previstas (supervisor_id, mes, tarea, avance, alumnos, productos_sociales, productos_academicos, observaciones)
        VALUES (${Number(usuario.id)}, ${mesFecha}::date, ${String(tarea).trim()}, ${Math.min(100, Math.max(0, Number(avance) || 0))},
                ${Math.max(0, Number(alumnos) || 0)}, ${productos_sociales || null}, ${productos_academicos || null}, ${observaciones || null})
        RETURNING id, tarea, avance, alumnos, productos_sociales, productos_academicos, observaciones
      `;
      return NextResponse.json({ success: true, actividad: { ...nueva, manual: true } });
    }

    if (accion === 'guardar-obstaculo') {
      const { mes: mesBody, descripcion, impacto, recomendacion } = body;
      const mes = /^\d{4}-\d{2}$/.test(mesBody || '') ? `${mesBody}-01` : mesBody;
      if (!mes || !descripcion) {
        return NextResponse.json({ error: 'Mes y descripción son requeridos' }, { status: 400 });
      }
      const [nuevo] = await sql`
        INSERT INTO supervision_obstaculos (supervisor_id, mes, restriccion, impacto, accion_correctiva)
        VALUES (${Number(usuario.id)}, ${mes}, ${descripcion}, ${impacto || 'medio'}, ${recomendacion || null})
        RETURNING id, supervisor_id, mes, restriccion AS descripcion, accion_correctiva AS recomendacion, impacto
      `;
      return NextResponse.json({ success: true, obstaculo: nuevo });
    }

    if (accion === 'generar') {
      const { tipo, mes: mesBody, ciclo_id, datos } = body;
      const mes = /^\d{4}-\d{2}$/.test(mesBody || '') ? `${mesBody}-01` : mesBody;

      if (!datos) {
        return NextResponse.json({ error: 'Faltan los datos del informe' }, { status: 400 });
      }

      let buffer: Buffer;
      const targetCicloId = ciclo_id ? parseInt(ciclo_id) : (datos.ciclo?.id || 1);
      const targetSupervisorId = tipo === 'supervisor' ? Number(usuario.id) : null;

      if (tipo === 'supervisor') {
        buffer = await generarBufferSupervisor(datos);
      } else {
        const [gEvolucion, gPlanVsEj] = await Promise.all([
          generarGraficoEvolucionMensual(datos.evolucion || []),
          generarGraficoPlanVsEjecutado(datos.metas || {}),
        ]);
        buffer = await generarDocxLider(datos, { evolucion: gEvolucion, planVsEjecutado: gPlanVsEj });
      }

      const [guardado] = await sql`
        INSERT INTO informes_vinculacion (tipo, ciclo_id, supervisor_id, mes, datos_json, generado_por)
        VALUES (${tipo}, ${targetCicloId}, ${targetSupervisorId}, ${mes || null}, ${JSON.stringify(datos)}, ${Number(usuario.id)})
        RETURNING id
      `;

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename=Informe_${tipo}_${mes || 'semestral'}.docx`,
          'X-Informe-Id': String(guardado.id),
        },
      });
    }

    return NextResponse.json({ error: 'Acción POST no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeSupervisarVinculacion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Se requiere id' }, { status: 400 });

    const sql = neon(process.env.DATABASE_URL!);
    if (searchParams.get('tipo') === 'no-prevista') {
      await sql`DELETE FROM informe_no_previstas WHERE id = ${parseInt(id)} AND supervisor_id = ${Number(usuario.id)}`;
      return NextResponse.json({ success: true });
    }
    await sql`
      DELETE FROM supervision_obstaculos
      WHERE id = ${parseInt(id)} AND supervisor_id = ${Number(usuario.id)}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
