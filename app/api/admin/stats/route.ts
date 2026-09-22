import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    
    // 1. Estudiantes de investigación (Meta: 6 en 2 años)
    const investigadores = await sql`
      SELECT COUNT(DISTINCT u.id)::int as total 
      FROM usuarios u 
      LEFT JOIN actividades_investigacion_pasante a ON a.usuario_id = u.id 
      WHERE u.rol = 'estudiante' 
        AND ('investigacion' = ANY(u.modulos_acceso) OR a.id IS NOT NULL)
    `;

    // 2. Satisfacción de beneficiarios (Meta: 70% o > 3.5/5.0)
    const encuestas = await sql`
      SELECT AVG(nivel_satisfaccion) as promedio, COUNT(*) as total_encuestas 
      FROM encuestas_satisfaccion
    `;

    // 3. Audiencia de Difusión (Meta: 50 beneficiarios/audiencia)
    const difusion = await sql`
      SELECT SUM(audiencia_alcanzada) as total_audiencia 
      FROM actividades_difusion
    `;

    // 4. Evaluaciones MCER (Iniciales / Diagnóstico vs Finales)
    const [evaluacionesMcer] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE tipo = 'inicial')::int as total_iniciales,
        COUNT(*) FILTER (WHERE tipo = 'final')::int as total_finales
      FROM evaluaciones_mcer
    `;

    // 5. Beneficiarios (Inscritos en espacios vs Registrados)
    const [beneficiariosStats] = await sql`
      SELECT 
        (SELECT COUNT(*)::int FROM usuarios WHERE rol = 'beneficiario') as total_registrados,
        (SELECT COUNT(DISTINCT beneficiario_id)::int FROM inscripciones_espacio) as total_inscritos
    `;

    // 6. Horas totales acreditadas por pasantes
    const [horasAcreditadas] = await sql`
      SELECT (
        COALESCE((SELECT SUM(horas) FROM horas_asistencia_instructor), 0) +
        COALESCE((SELECT SUM(horas_total) FROM horas_podcast_pasante), 0) +
        COALESCE((SELECT SUM(horas) FROM actividades_investigacion_pasante), 0)
      )::float as total_horas
    `;

    // 7. Espacios de enseñanza activos
    const [espaciosStats] = await sql`
      SELECT COUNT(*)::int as total FROM "espacios_enseñanza"
    `;

    // 8. Contribuciones académicas por tipo (artículos regionales/alto impacto, libros, capítulos, etc.)
    const contribucionesPorTipo = await prisma.contribution.groupBy({
      by: ['tipoPublicacion'],
      _count: { _all: true },
    });
    const conteoTipo = Object.fromEntries(contribucionesPorTipo.map(c => [c.tipoPublicacion, c._count._all]));

    return NextResponse.json({
      success: true,
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
