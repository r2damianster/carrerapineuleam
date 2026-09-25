import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    // Filtro por período académico (ciclos_academicos). Sin periodo_id = acumulado de todo el proyecto.
    const periodos = await sql`SELECT id, nombre, to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio, to_char(fecha_fin, 'YYYY-MM-DD') AS fecha_fin FROM ciclos_academicos ORDER BY ciclos_academicos.fecha_inicio DESC`;
    const periodoIdParam = new URL(request.url).searchParams.get('periodo_id');
    const periodo = periodoIdParam ? periodos.find((p: any) => String(p.id) === periodoIdParam) : null;
    const periodoId: number | null = periodo ? Number(periodo.id) : null;
    const desde: string | null = periodo ? String(periodo.fecha_inicio).slice(0, 10) : null;
    const hasta: string | null = periodo ? String(periodo.fecha_fin).slice(0, 10) : null;

    // 1. Estudiantes de investigación (Meta: 6 en 2 años)
    // Acumulado: módulo investigacion o alguna actividad. Con período: quienes reportaron
    // actividades dentro del período, más quienes tienen el módulo si el período es el vigente
    // (el módulo no tiene fecha, refleja la asignación actual).
    const investigadores = await sql`
      SELECT COUNT(DISTINCT u.id)::int as total
      FROM usuarios u
      LEFT JOIN actividades_investigacion_pasante a ON a.usuario_id = u.id
        AND (${desde}::date IS NULL OR a.fecha BETWEEN ${desde}::date AND ${hasta}::date)
      WHERE u.rol = 'estudiante'
        AND (
          (
            'investigacion' = ANY(u.modulos_acceso)
            AND (${desde}::date IS NULL OR CURRENT_DATE BETWEEN ${desde}::date AND ${hasta}::date)
          )
          OR a.id IS NOT NULL
        )
    `;

    // 2. Satisfacción de beneficiarios (Meta: 70% o > 3.5/5.0)
    const encuestas = await sql`
      SELECT AVG(nivel_satisfaccion) as promedio, COUNT(*) as total_encuestas
      FROM encuestas_satisfaccion
      WHERE (${desde}::date IS NULL OR fecha::date BETWEEN ${desde}::date AND ${hasta}::date)
    `;

    // 3. Audiencia de Difusión (Meta: 50 beneficiarios/audiencia)
    const difusion = await sql`
      SELECT SUM(audiencia_alcanzada) as total_audiencia
      FROM actividades_difusion
      WHERE (${desde}::date IS NULL OR fecha BETWEEN ${desde}::date AND ${hasta}::date)
    `;

    // 4. Evaluaciones MCER (Iniciales / Diagnóstico vs Finales)
    const [evaluacionesMcer] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE tipo = 'inicial')::int as total_iniciales,
        COUNT(*) FILTER (WHERE tipo = 'final')::int as total_finales
      FROM evaluaciones_mcer
      WHERE (${desde}::date IS NULL OR fecha_evaluacion BETWEEN ${desde}::date AND ${hasta}::date)
    `;

    // 5. Beneficiarios (Inscritos en espacios vs Registrados)
    const [beneficiariosStats] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM usuarios WHERE rol = 'beneficiario') as total_registrados,
        (SELECT COUNT(DISTINCT ie.beneficiario_id)::int FROM inscripciones_espacio ie
           JOIN "espacios_enseñanza" e ON e.id = ie.espacio_id
           WHERE (${periodoId}::int IS NULL OR e.ciclo_id = ${periodoId}::int)) as total_inscritos
    `;

    // 6. Horas totales acreditadas por pasantes
    const [horasAcreditadas] = await sql`
      SELECT (
        COALESCE((SELECT SUM(horas) FROM horas_asistencia_instructor
                   WHERE (${desde}::date IS NULL OR creado_en::date BETWEEN ${desde}::date AND ${hasta}::date)), 0) +
        COALESCE((SELECT SUM(horas_total) FROM horas_podcast_pasante WHERE estado_aprobacion = 'aprobado'
                   AND (${desde}::date IS NULL OR creado_en::date BETWEEN ${desde}::date AND ${hasta}::date)), 0) +
        COALESCE((SELECT SUM(horas) FROM actividades_investigacion_pasante WHERE estado_aprobacion = 'aprobado'
                   AND (${desde}::date IS NULL OR fecha BETWEEN ${desde}::date AND ${hasta}::date)), 0)
      )::float as total_horas
    `;

    // 7. Espacios de enseñanza activos
    const [espaciosStats] = await sql`
      SELECT COUNT(*)::int as total FROM "espacios_enseñanza"
      WHERE (${periodoId}::int IS NULL OR ciclo_id = ${periodoId}::int)
    `;

    // 8. Contribuciones académicas por tipo (artículos regionales/alto impacto, libros, capítulos, etc.)
    const contribucionesPorTipo = await prisma.contribution.groupBy({
      by: ['tipoPublicacion'],
      where: periodo ? { fechaSubida: { gte: new Date(`${desde}T00:00:00Z`), lte: new Date(`${hasta}T23:59:59Z`) } } : undefined,
      _count: { _all: true },
    });
    const conteoTipo = Object.fromEntries(contribucionesPorTipo.map(c => [c.tipoPublicacion, c._count._all]));

    return NextResponse.json({
      success: true,
      periodos: periodos.map((p: any) => ({ id: p.id, nombre: p.nombre })),
      periodoSeleccionado: periodoId,
      data: {
        investigadores: parseInt(investigadores[0].total),
        satisfaccionPromedio: encuestas[0].promedio ? parseFloat(encuestas[0].promedio).toFixed(1) : 0,
        totalEncuestas: parseInt(encuestas[0].total_encuestas),
        audiencia: difusion[0].total_audiencia ? parseInt(difusion[0].total_audiencia) : 0,
        evaluacionesIniciales: evaluacionesMcer?.total_iniciales || 0,
        evaluacionesFinales: evaluacionesMcer?.total_finales || 0,
        totalInscritos: beneficiariosStats?.total_inscritos || 0,
        totalBeneficiarios: beneficiariosStats?.total_registrados || 0,
        horasTotalesAcreditadas: horasAcreditadas?.total_horas || 0,
        espaciosActivos: espaciosStats?.total || 0,
        contribuciones: {
          articulosRegionales: conteoTipo.ARTICULO_REGIONAL || 0,
          articulosAltoImpacto: conteoTipo.ARTICULO_ALTO_IMPACTO || 0,
          libros: conteoTipo.LIBRO || 0,
          capitulosLibro: conteoTipo.CAPITULO_LIBRO || 0,
          memoriasEvento: conteoTipo.MEMORIA_EVENTO || 0,
          propiedadIntelectual: conteoTipo.PROPIEDAD_INTELECTUAL || 0,
          total: contribucionesPorTipo.reduce((suma, c) => suma + c._count._all, 0),
        },
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
