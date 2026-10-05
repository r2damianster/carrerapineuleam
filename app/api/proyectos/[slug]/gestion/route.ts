import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGestionarVinculacion } from '@/lib/modulos';
import { puedeGestionarProyecto } from '@/lib/permisosProyecto';
import { logSuperadminAction } from '@/lib/superadmin-auth';
import { periodoDeCiclo } from '@/lib/periodosProyecto';

// Líder/colíder del proyecto (proyecto_miembros) o administración del sitio; el líder de
// Vinculación conserva su acceso al proyecto 'vinculacion'.
async function autorizar(sql: any, usuario: any, proyectoId: string) {
  if (!usuario) return false;
  if (proyectoId === 'vinculacion' && puedeGestionarVinculacion(usuario)) return true;
  return puedeGestionarProyecto(sql, usuario, proyectoId);
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const proyectoId = params.slug;
  const usuario = await getAppSessionFromCookies();
  const sql = neon(process.env.DATABASE_URL!);
  if (!(await autorizar(sql, usuario, proyectoId))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const seccion = searchParams.get('seccion') || 'ficha';
  const cicloIdParam = searchParams.get('ciclo_id');
  const cicloId = cicloIdParam ? parseInt(cicloIdParam) : null;

  try {
    if (seccion === 'ficha') {
      const [proyecto] = await sql`
        SELECT * FROM proyectos WHERE id = ${proyectoId}
      `;
      const docentes = await sql`
        SELECT id, nombres, apellidos, email, titulo_grado, post_grado, cargo_institucional
        FROM usuarios
        WHERE (rol IN ('profesor', 'admin') AND activado = true) OR titulo_grado IS NOT NULL
        ORDER BY nombres ASC
      `;
      const ciclos = await sql`
        SELECT id, nombre, fecha_inicio, fecha_fin
        FROM ciclos_academicos
        ORDER BY id DESC
      `;
      return NextResponse.json({ success: true, ficha: proyecto || null, docentes, ciclos });
    }

    if (seccion === 'arbol') {
      const nodos = await sql`
        SELECT id, nivel, padre_id, texto, orden FROM proyecto_arbol_problemas
        WHERE proyecto_id = ${proyectoId} AND activo = true ORDER BY orden, id
      `;
      return NextResponse.json({ success: true, nodos });
    }

    if (seccion === 'objetivos') {
      const objetivos = await sql`
        SELECT * FROM proyecto_objetivos 
        WHERE proyecto_id = ${proyectoId}
        ORDER BY tipo DESC, orden ASC, id ASC
      `;

      const actividades = await sql`
        SELECT a.*, e.nombre AS espacio_nombre, u.nombres AS resp_nombres, u.apellidos AS resp_apellidos
        FROM proyecto_actividades_plan a
        LEFT JOIN espacios_enseñanza e ON a.espacio_id = e.id
        LEFT JOIN usuarios u ON a.responsable_id = u.id
        WHERE a.objetivo_id IN (SELECT id FROM proyecto_objetivos WHERE proyecto_id = ${proyectoId})
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
        WHERE proyecto_id = ${proyectoId} AND ciclo_id = ${cicloId}
      `;
      const personalizadas = await sql`
        SELECT id, descripcion, meta, logrado, unidad FROM proyecto_metas_personalizadas
        WHERE proyecto_id = ${proyectoId} AND ciclo_id = ${cicloId}
        ORDER BY id ASC
      `;
      const ciclos = await sql`SELECT id, nombre FROM ciclos_academicos ORDER BY id DESC`;
      return NextResponse.json({ success: true, metas: metas || null, personalizadas, ciclos });
    }

    if (seccion === 'presupuesto') {
      if (!cicloId) {
        return NextResponse.json({ error: 'Se requiere ciclo_id' }, { status: 400 });
      }
      const items = await sql`
        SELECT p.*, u.nombres AS resp_nombres, u.apellidos AS resp_apellidos
        FROM proyecto_presupuesto p
        LEFT JOIN usuarios u ON p.responsable_id = u.id
        WHERE p.proyecto_id = ${proyectoId} AND p.ciclo_id = ${cicloId}
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

    return NextResponse.json({ error: 'Sección no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error GET /api/proyectos/[slug]/gestion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const proyectoId = params.slug;
  const usuario = await getAppSessionFromCookies();
  const sql = neon(process.env.DATABASE_URL!);
  if (!(await autorizar(sql, usuario, proyectoId)) || !usuario) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const seccion = searchParams.get('seccion') || 'ficha';
  const accion = searchParams.get('accion');

  const body = await request.json();

  try {
    if (seccion === 'arbol') {
      const NIVELES = ['central', 'causa_directa', 'causa_indirecta', 'efecto_directo', 'efecto_final'];
      if (accion === 'crear') {
        const { nivel, texto, padre_id } = body;
        if (!NIVELES.includes(nivel) || !String(texto || '').trim()) {
          return NextResponse.json({ error: 'Nivel y texto son requeridos' }, { status: 400 });
        }
        if (nivel === 'causa_indirecta' && !padre_id) {
          return NextResponse.json({ error: 'Una causa indirecta necesita su causa directa' }, { status: 400 });
        }
        const [ultimo] = await sql`
          SELECT COALESCE(MAX(orden), 0)::int AS orden FROM proyecto_arbol_problemas
          WHERE proyecto_id = ${proyectoId} AND nivel = ${nivel} AND padre_id IS NOT DISTINCT FROM ${padre_id || null}
        `;
        const [nuevo] = await sql`
          INSERT INTO proyecto_arbol_problemas (proyecto_id, nivel, padre_id, texto, orden)
          VALUES (${proyectoId}, ${nivel}, ${padre_id || null}, ${String(texto).trim()}, ${ultimo.orden + 1})
          RETURNING id, nivel, padre_id, texto, orden
        `;
        return NextResponse.json({ success: true, nodo: nuevo });
      }
      if (accion === 'editar') {
        const { id, texto } = body;
        if (!id || !String(texto || '').trim()) return NextResponse.json({ error: 'Id y texto son requeridos' }, { status: 400 });
        await sql`UPDATE proyecto_arbol_problemas SET texto = ${String(texto).trim()} WHERE id = ${id} AND proyecto_id = ${proyectoId}`;
        return NextResponse.json({ success: true });
      }
      if (accion === 'eliminar') {
        await sql`DELETE FROM proyecto_arbol_problemas WHERE id = ${body.id} AND proyecto_id = ${proyectoId}`;
        return NextResponse.json({ success: true });
      }
    }

    if (seccion === 'ficha') {
      const {
        codigo, unidad_academica, carrera, entidad_beneficiaria,
        vigencia_inicio, vigencia_fin, ods, linea_investigacion, zona, parroquia,
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
          zona = ${zona || 'Manta (Distrito 13D02)'},
          parroquia = ${parroquia || null},
          codigo_documento_lider = ${codigo_documento_lider || null},
          revision_documento_lider = ${revision_documento_lider || null},
          codigo_documento_supervisor = ${codigo_documento_supervisor || null},
          revision_documento_supervisor = ${revision_documento_supervisor || null},
          firmante_responsable_id = ${firmante_responsable_id || null},
          lider_id = ${lider_id || null},
          actualizado_en = now()
        WHERE id = ${proyectoId}
      `;

      await logSuperadminAction({
        actor: usuario,
        tipo_accion: 'crud_update',
        tabla_afectada: 'proyectos',
        detalle: `Actualizó los campos de ficha en la tabla proyectos para ${proyectoId}`,
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
          SELECT * FROM proyecto_actividades_plan
          WHERE ciclo_id = ${desde_ciclo_id} AND activo = true
            AND objetivo_id IN (SELECT id FROM proyecto_objetivos WHERE proyecto_id = ${proyectoId})
        `;
        const [cicloDestino] = await sql`SELECT nombre FROM ciclos_academicos WHERE id = ${hacia_ciclo_id}`;
        const periodoDestino = periodoDeCiclo(cicloDestino?.nombre || '');
        let duplicadas = 0;
        for (const act of actividadesOrigen) {
          await sql`
            INSERT INTO proyecto_actividades_plan (
              objetivo_id, actividad, metodologia, ciclo_id, mes_inicio, mes_fin, espacio_id, responsable_id, activo,
              meta_cantidad, unidad, fuente
            ) VALUES (
              ${act.objetivo_id}, ${act.actividad}, ${act.metodologia}, ${hacia_ciclo_id},
              ${periodoDestino ? periodoDestino.desde : act.mes_inicio}, ${periodoDestino ? periodoDestino.hasta : act.mes_fin},
              ${act.espacio_id}, ${act.responsable_id}, true,
              ${act.meta_cantidad}, ${act.unidad}, ${act.fuente}
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
          VALUES (${proyectoId}, ${tipo || 'especifico'}, ${texto}, ${orden || 0}, true)
          RETURNING *
        `;
        return NextResponse.json({ success: true, data: nuevoObj });
      }

      if (accion === 'editar_objetivo') {
        const { id, tipo, texto, orden, activo } = body;
        await sql`
          UPDATE proyecto_objetivos
          SET tipo = ${tipo}, texto = ${texto}, orden = ${orden}, activo = ${activo}
          WHERE id = ${id} AND proyecto_id = ${proyectoId}
        `;
        return NextResponse.json({ success: true });
      }

      if (accion === 'eliminar_objetivo') {
        const { id } = body;
        await sql`DELETE FROM proyecto_objetivos WHERE id = ${id} AND proyecto_id = ${proyectoId}`;
        return NextResponse.json({ success: true });
      }

      if (accion === 'crear_actividad') {
        const { objetivo_id, actividad, metodologia, ciclo_id, mes_inicio, mes_fin, espacio_id, responsable_id, meta_cantidad, unidad, fuente } = body;
        if (!objetivo_id || !actividad) return NextResponse.json({ error: 'Objetivo y actividad son requeridos' }, { status: 400 });
        const [objetivoDelProyecto] = await sql`SELECT 1 FROM proyecto_objetivos WHERE id = ${objetivo_id} AND proyecto_id = ${proyectoId}`;
        if (!objetivoDelProyecto) return NextResponse.json({ error: 'El objetivo no pertenece a este proyecto' }, { status: 400 });
        const [nuevaAct] = await sql`
          INSERT INTO proyecto_actividades_plan (
            objetivo_id, actividad, metodologia, ciclo_id, mes_inicio, mes_fin, espacio_id, responsable_id, activo,
            meta_cantidad, unidad, fuente
          ) VALUES (
            ${objetivo_id}, ${actividad}, ${metodologia || null}, ${ciclo_id || null},
            ${mes_inicio || null}, ${mes_fin || null}, ${espacio_id || null}, ${responsable_id || null}, true,
            ${meta_cantidad === '' || meta_cantidad == null ? null : Number(meta_cantidad)}, ${unidad || null}, ${fuente || 'manual'}
          )
          RETURNING *
        `;
        return NextResponse.json({ success: true, data: nuevaAct });
      }

      if (accion === 'editar_actividad') {
        const { id, actividad, metodologia, ciclo_id, mes_inicio, mes_fin, espacio_id, responsable_id, activo, meta_cantidad, unidad, fuente } = body;
        await sql`
          UPDATE proyecto_actividades_plan
          SET actividad = ${actividad}, metodologia = ${metodologia || null}, ciclo_id = ${ciclo_id || null},
              mes_inicio = ${mes_inicio || null}, mes_fin = ${mes_fin || null},
              espacio_id = ${espacio_id || null}, responsable_id = ${responsable_id || null}, activo = ${activo},
              meta_cantidad = ${meta_cantidad === '' || meta_cantidad == null ? null : Number(meta_cantidad)},
              unidad = ${unidad || null}, fuente = ${fuente || 'manual'}
          WHERE id = ${id}
            AND objetivo_id IN (SELECT id FROM proyecto_objetivos WHERE proyecto_id = ${proyectoId})
        `;
        return NextResponse.json({ success: true });
      }

      if (accion === 'eliminar_actividad') {
        const { id } = body;
        await sql`
          DELETE FROM proyecto_actividades_plan
          WHERE id = ${id} AND objetivo_id IN (SELECT id FROM proyecto_objetivos WHERE proyecto_id = ${proyectoId})
        `;
        return NextResponse.json({ success: true });
      }
    }

    if (seccion === 'metas' && accion) {
      if (accion === 'crear_meta') {
        const { ciclo_id, descripcion, meta, logrado, unidad } = body;
        if (!ciclo_id || !String(descripcion || '').trim()) {
          return NextResponse.json({ error: 'Ciclo y descripción son requeridos' }, { status: 400 });
        }
        const [nueva] = await sql`
          INSERT INTO proyecto_metas_personalizadas (proyecto_id, ciclo_id, descripcion, meta, logrado, unidad)
          VALUES (${proyectoId}, ${ciclo_id}, ${String(descripcion).trim()}, ${Number(meta) || 0}, ${Number(logrado) || 0}, ${unidad || null})
          RETURNING id, descripcion, meta, logrado, unidad
        `;
        return NextResponse.json({ success: true, data: nueva });
      }
      if (accion === 'editar_meta') {
        const { id, descripcion, meta, logrado, unidad } = body;
        if (!id || !String(descripcion || '').trim()) {
          return NextResponse.json({ error: 'Id y descripción son requeridos' }, { status: 400 });
        }
        await sql`
          UPDATE proyecto_metas_personalizadas
          SET descripcion = ${String(descripcion).trim()}, meta = ${Number(meta) || 0},
              logrado = ${Number(logrado) || 0}, unidad = ${unidad || null}
          WHERE id = ${id} AND proyecto_id = ${proyectoId}
        `;
        return NextResponse.json({ success: true });
      }
      if (accion === 'eliminar_meta') {
        await sql`DELETE FROM proyecto_metas_personalizadas WHERE id = ${body.id} AND proyecto_id = ${proyectoId}`;
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
          ${proyectoId}, ${ciclo_id}, ${meta_estudiantes || 0}, ${meta_docentes || 0},
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
            ${proyectoId}, ${ciclo_id}, ${cedula_presupuestaria || null}, ${concepto},
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
          WHERE id = ${id} AND proyecto_id = ${proyectoId}
        `;
        return NextResponse.json({ success: true });
      }

      if (accion === 'eliminar_item') {
        const { id } = body;
        await sql`DELETE FROM proyecto_presupuesto WHERE id = ${id} AND proyecto_id = ${proyectoId}`;
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error POST /api/proyectos/[slug]/gestion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
