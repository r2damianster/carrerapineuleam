import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarVinculacion } from '@/lib/modulos';
import { logSuperadminAction } from '@/lib/superadmin-auth';
import { enriquecerTexto } from '@/app/utilidades/_lib/enriquecerTexto';

export async function GET(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !puedeGestionarVinculacion(usuario)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const seccion = searchParams.get('seccion') || 'ficha';
  const cicloIdParam = searchParams.get('ciclo_id');
  const cicloId = cicloIdParam ? parseInt(cicloIdParam) : null;

  const sql = neon(process.env.DATABASE_URL!);

  try {
    if (seccion === 'ficha') {
      const [proyecto] = await sql`
        SELECT * FROM proyectos WHERE id = 'vinculacion'
      `;
      const docentes = await sql`
        SELECT id, nombres, apellidos, email, titulo_grado, post_grado, cargo_institucional 
        FROM usuarios 
        WHERE rol IN ('profesor', 'admin') AND activado = true
        ORDER BY nombres ASC
      `;
      const ciclos = await sql`
        SELECT id, nombre, fecha_inicio, fecha_fin, activo
        FROM ciclos_academicos
        ORDER BY id DESC
      `;
      return NextResponse.json({ success: true, ficha: proyecto || null, docentes, ciclos });
    }

    if (seccion === 'objetivos') {
      const objetivos = await sql`
        SELECT * FROM proyecto_objetivos 
        WHERE proyecto_id = 'vinculacion'
        ORDER BY tipo DESC, orden ASC, id ASC
      `;

      const actividades = await sql`
        SELECT a.*, e.nombre AS espacio_nombre, u.nombres AS resp_nombres, u.apellidos AS resp_apellidos
        FROM proyecto_actividades_plan a
        LEFT JOIN espacios_enseñanza e ON a.espacio_id = e.id
        LEFT JOIN usuarios u ON a.responsable_id = u.id
        ORDER BY a.id ASC
      `;

      const objetivosConActividades = objetivos.map(obj => ({
        ...obj,
        actividades: actividades.filter(act => act.objetivo_id === obj.id)
      }));

      const espacios = await sql`
        SELECT id, nombre, area FROM espacios_enseñanza ORDER BY nombre ASC
      `;
      const docentes = await sql`
        SELECT id, nombres, apellidos FROM usuarios WHERE rol IN ('profesor', 'admin') ORDER BY nombres ASC
      `;
      const ciclos = await sql`
        SELECT id, nombre FROM ciclos_academicos ORDER BY id DESC
      `;

      return NextResponse.json({
        success: true,
        objetivos: objetivosConActividades,
        espacios,
        docentes,
        ciclos
      });
    }

    if (seccion === 'metas') {
      if (!cicloId) {
        return NextResponse.json({ error: 'Se requiere ciclo_id' }, { status: 400 });
      }
      const [metas] = await sql`
        SELECT * FROM proyecto_metas_ciclo 
        WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${cicloId}
      `;
      const ciclos = await sql`SELECT id, nombre FROM ciclos_academicos ORDER BY id DESC`;
      return NextResponse.json({ success: true, metas: metas || null, ciclos });
    }

    if (seccion === 'presupuesto') {
      if (!cicloId) {
        return NextResponse.json({ error: 'Se requiere ciclo_id' }, { status: 400 });
      }
      const items = await sql`
        SELECT p.*, u.nombres AS resp_nombres, u.apellidos AS resp_apellidos
        FROM proyecto_presupuesto p
        LEFT JOIN usuarios u ON p.responsable_id = u.id
        WHERE p.proyecto_id = 'vinculacion' AND p.ciclo_id = ${cicloId}
        ORDER BY p.id ASC
      `;

      let totalSolicitado = 0;
      let totalEjecutado = 0;
      items.forEach(item => {
        totalSolicitado += Number(item.solicitado || 0);
        totalEjecutado += Number(item.ejecutado || 0);
      });
      const porcentaje = totalSolicitado > 0 ? (totalEjecutado / totalSolicitado) * 100 : 0;

      const docentes = await sql`SELECT id, nombres, apellidos FROM usuarios WHERE rol IN ('profesor', 'admin') ORDER BY nombres ASC`;
      const ciclos = await sql`SELECT id, nombre FROM ciclos_academicos ORDER BY id DESC`;

      return NextResponse.json({
        success: true,
        items,
        resumen: { totalSolicitado, totalEjecutado, porcentaje: Math.round(porcentaje * 100) / 100 },
        docentes,
        ciclos
      });
    }

    if (seccion === 'textos') {
      if (!cicloId) {
        return NextResponse.json({ error: 'Se requiere ciclo_id' }, { status: 400 });
      }
      const filas = await sql`
        SELECT clave, texto FROM proyecto_textos_ciclo 
        WHERE proyecto_id = 'vinculacion' AND ciclo_id = ${cicloId}
      `;
      const textosMap: Record<string, string> = {};
      filas.forEach(f => { textosMap[f.clave] = f.texto; });
      const ciclos = await sql`SELECT id, nombre FROM ciclos_academicos ORDER BY id DESC`;

      return NextResponse.json({ success: true, textos: textosMap, ciclos });
    }

    return NextResponse.json({ error: 'Sección no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error GET /vinculacion/proyecto/api:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !puedeGestionarVinculacion(usuario)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const seccion = searchParams.get('seccion') || 'ficha';
  const accion = searchParams.get('accion');

  const sql = neon(process.env.DATABASE_URL!);
  const body = await request.json();

  try {
    if (seccion === 'ficha') {
      const {
        codigo, unidad_academica, carrera, entidad_beneficiaria,
        vigencia_inicio, vigencia_fin, ods, linea_investigacion, zona,
        codigo_documento_lider, revision_documento_lider,
        codigo_documento_supervisor, revision_documento_supervisor,
        firmante_responsable_id, lider_id
      } = body;

      await sql`
        UPDATE proyectos SET
          codigo = ${codigo || null},
          unidad_academica = ${unidad_academica || null},
          carrera = ${carrera || null},
          entidad_beneficiaria = ${entidad_beneficiaria || null},
          vigencia_inicio = ${vigencia_inicio || null},
          vigencia_fin = ${vigencia_fin || null},
          ods = ${ods || null},
          linea_investigacion = ${linea_investigacion || null},
          zona = ${zona || 'Distrito 13D02 Manta'},
          codigo_documento_lider = ${codigo_documento_lider || null},
          revision_documento_lider = ${revision_documento_lider || null},
          codigo_documento_supervisor = ${codigo_documento_supervisor || null},
          revision_documento_supervisor = ${revision_documento_supervisor || null},
          firmante_responsable_id = ${firmante_responsable_id || null},
          lider_id = ${lider_id || null},
          actualizado_en = now()
        WHERE id = 'vinculacion'
      `;

      await logSuperadminAction({
        actor: usuario,
        tipo_accion: 'crud_update',
        tabla_afectada: 'proyectos',
        detalle: 'Actualizó los campos de ficha en la tabla proyectos para Vinculación',
      });

      return NextResponse.json({ success: true, message: 'Ficha del proyecto actualizada en la tabla proyectos' });
    }

    if (seccion === 'objetivos') {
      if (accion === 'copiar_ciclo') {
        const { desde_ciclo_id, hacia_ciclo_id } = body;
        if (!desde_ciclo_id || !hacia_ciclo_id) {
          return NextResponse.json({ error: 'Se requieren desde_ciclo_id y hacia_ciclo_id' }, { status: 400 });
        }
        const actividadesOrigen = await sql`
          SELECT * FROM proyecto_actividades_plan WHERE ciclo_id = ${desde_ciclo_id} AND activo = true
        `;
        let duplicadas = 0;
        for (const act of actividadesOrigen) {
          await sql`
            INSERT INTO proyecto_actividades_plan (
              objetivo_id, actividad, metodologia, ciclo_id, mes_inicio, mes_fin, espacio_id, responsable_id, activo
            ) VALUES (
              ${act.objetivo_id}, ${act.actividad}, ${act.metodologia}, ${hacia_ciclo_id},
              ${act.mes_inicio}, ${act.mes_fin}, ${act.espacio_id}, ${act.responsable_id}, true
            )
          `;
          duplicadas++;
        }
        return NextResponse.json({ success: true, message: `Se copiaron ${duplicadas} actividades al nuevo ciclo.` });
      }

      if (accion === 'crear_objetivo') {
        const { tipo, texto, orden } = body;
        if (!texto) return NextResponse.json({ error: 'Texto es requerido' }, { status: 400 });
        const [nuevoObj] = await sql`
          INSERT INTO proyecto_objetivos (proyecto_id, tipo, texto, orden, activo)
          VALUES ('vinculacion', ${tipo || 'especifico'}, ${texto}, ${orden || 0}, true)
          RETURNING *
        `;
        return NextResponse.json({ success: true, data: nuevoObj });
      }

      if (accion === 'editar_objetivo') {
        const { id, tipo, texto, orden, activo } = body;
        await sql`
          UPDATE proyecto_objetivos
          SET tipo = ${tipo}, texto = ${texto}, orden = ${orden}, activo = ${activo}
          WHERE id = ${id} AND proyecto_id = 'vinculacion'
        `;
        return NextResponse.json({ success: true });
      }

      if (accion === 'eliminar_objetivo') {
        const { id } = body;
        await sql`DELETE FROM proyecto_objetivos WHERE id = ${id} AND proyecto_id = 'vinculacion'`;
        return NextResponse.json({ success: true });
      }

      if (accion === 'crear_actividad') {
        const { objetivo_id, actividad, metodologia, ciclo_id, mes_inicio, mes_fin, espacio_id, responsable_id } = body;
        if (!objetivo_id || !actividad) return NextResponse.json({ error: 'Objetivo y actividad son requeridos' }, { status: 400 });
        const [nuevaAct] = await sql`
          INSERT INTO proyecto_actividades_plan (
            objetivo_id, actividad, metodologia, ciclo_id, mes_inicio, mes_fin, espacio_id, responsable_id, activo
          ) VALUES (
            ${objetivo_id}, ${actividad}, ${metodologia || null}, ${ciclo_id || null},
            ${mes_inicio || null}, ${mes_fin || null}, ${espacio_id || null}, ${responsable_id || null}, true
          )
          RETURNING *
        `;
        return NextResponse.json({ success: true, data: nuevaAct });
      }

      if (accion === 'editar_actividad') {
        const { id, actividad, metodologia, ciclo_id, mes_inicio, mes_fin, espacio_id, responsable_id, activo } = body;
        await sql`
          UPDATE proyecto_actividades_plan
          SET actividad = ${actividad}, metodologia = ${metodologia || null}, ciclo_id = ${ciclo_id || null},
              mes_inicio = ${mes_inicio || null}, mes_fin = ${mes_fin || null},
              espacio_id = ${espacio_id || null}, responsable_id = ${responsable_id || null}, activo = ${activo}
          WHERE id = ${id}
        `;
        return NextResponse.json({ success: true });
      }

      if (accion === 'eliminar_actividad') {
        const { id } = body;
        await sql`DELETE FROM proyecto_actividades_plan WHERE id = ${id}`;
        return NextResponse.json({ success: true });
      }
    }

    if (seccion === 'metas') {
      const { ciclo_id, meta_estudiantes, meta_docentes, meta_beneficiarios_directos, meta_beneficiarios_indirectos } = body;
      if (!ciclo_id) return NextResponse.json({ error: 'Se requiere ciclo_id' }, { status: 400 });

      await sql`
        INSERT INTO proyecto_metas_ciclo (
          proyecto_id, ciclo_id, meta_estudiantes, meta_docentes, meta_beneficiarios_directos, meta_beneficiarios_indirectos
        ) VALUES (
          'vinculacion', ${ciclo_id}, ${meta_estudiantes || 0}, ${meta_docentes || 0},
          ${meta_beneficiarios_directos || 0}, ${meta_beneficiarios_indirectos || 0}
        )
        ON CONFLICT (proyecto_id, ciclo_id) DO UPDATE SET
          meta_estudiantes = EXCLUDED.meta_estudiantes,
          meta_docentes = EXCLUDED.meta_docentes,
          meta_beneficiarios_directos = EXCLUDED.meta_beneficiarios_directos,
          meta_beneficiarios_indirectos = EXCLUDED.meta_beneficiarios_indirectos
      `;
      return NextResponse.json({ success: true, message: 'Metas actualizadas correctamente' });
    }

    if (seccion === 'presupuesto') {
      if (accion === 'crear_item') {
        const { ciclo_id, cedula_presupuestaria, concepto, solicitado, ejecutado, responsable_id } = body;
        if (!ciclo_id || !concepto) return NextResponse.json({ error: 'Ciclo y concepto son requeridos' }, { status: 400 });
        const [nuevo] = await sql`
          INSERT INTO proyecto_presupuesto (
            proyecto_id, ciclo_id, cedula_presupuestaria, concepto, solicitado, ejecutado, responsable_id
          ) VALUES (
            'vinculacion', ${ciclo_id}, ${cedula_presupuestaria || null}, ${concepto},
            ${solicitado || 0}, ${ejecutado || 0}, ${responsable_id || null}
          ) RETURNING *
        `;
        return NextResponse.json({ success: true, data: nuevo });
      }

      if (accion === 'editar_item') {
        const { id, cedula_presupuestaria, concepto, solicitado, ejecutado, responsable_id } = body;
        await sql`
          UPDATE proyecto_presupuesto
          SET cedula_presupuestaria = ${cedula_presupuestaria || null},
              concepto = ${concepto},
              solicitado = ${solicitado || 0},
              ejecutado = ${ejecutado || 0},
              responsable_id = ${responsable_id || null}
          WHERE id = ${id} AND proyecto_id = 'vinculacion'
        `;
        return NextResponse.json({ success: true });
      }

      if (accion === 'eliminar_item') {
        const { id } = body;
        await sql`DELETE FROM proyecto_presupuesto WHERE id = ${id} AND proyecto_id = 'vinculacion'`;
        return NextResponse.json({ success: true });
      }
    }

    if (seccion === 'textos') {
      if (accion === 'borrador_ia') {
        const { clave, borrador_previo } = body;
        const promptBase = borrador_previo && borrador_previo.trim().length > 3
          ? borrador_previo
          : `Redacta una propuesta de borrador formal para la sección "${clave}" del informe de Vinculación universitaria en Ecuador.`;

        const [resultado, errIA] = await enriquecerTexto('oficio_cuerpo_generar', promptBase);
        if (errIA) return NextResponse.json({ error: errIA }, { status: 500 });
        return NextResponse.json({ success: true, borrador: resultado });
      }

      const { ciclo_id, textos } = body; // textos = { clave: texto }
      if (!ciclo_id || !textos) return NextResponse.json({ error: 'ciclo_id y textos son requeridos' }, { status: 400 });

      for (const [clave, texto] of Object.entries(textos)) {
        await sql`
          INSERT INTO proyecto_textos_ciclo (proyecto_id, ciclo_id, clave, texto)
          VALUES ('vinculacion', ${ciclo_id}, ${clave}, ${String(texto || '')})
          ON CONFLICT (proyecto_id, ciclo_id, clave) DO UPDATE SET texto = EXCLUDED.texto
        `;
      }
      return NextResponse.json({ success: true, message: 'Textos cualitativos del ciclo guardados' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error POST /vinculacion/proyecto/api:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
