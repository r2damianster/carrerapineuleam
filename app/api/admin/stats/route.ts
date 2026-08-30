import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getUserSessionFromCookies } from '@/lib/userSession';

export async function GET() {
  try {
    const usuario = await getUserSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // 1. Estudiantes de investigación (Meta: 6 en 2 años)
    const investigadores = await sql`
      SELECT COUNT(*) as total 
      FROM perfiles_estudiantes 
      WHERE titulo_investigacion IS NOT NULL AND titulo_investigacion != ''
    `;

    // 2. Beneficiarios aprobados con nota >= 4.0 (Meta: 25 por ciclo)
    const aprobados = await sql`
      SELECT COUNT(*) as total 
      FROM calificaciones_ciclo 
      WHERE nota_promedio >= 4.0
    `;

    // 3. Satisfacción de beneficiarios (Meta: 70% o > 3.5/5.0)
    const encuestas = await sql`
      SELECT AVG(nivel_satisfaccion) as promedio, COUNT(*) as total_encuestas 
      FROM encuestas_satisfaccion
    `;

    // 4. Audiencia de Difusión (Meta: 50 beneficiarios/audiencia)
    const difusion = await sql`
      SELECT SUM(audiencia_alcanzada) as total_audiencia 
      FROM actividades_difusion
    `;

    // 5. Mejora MCER (Beneficiarios con test inicial y final)
    // Para simplificar la demo, contamos cuántos test 'final' hay registrados
    const mejorasMcer = await sql`
      SELECT COUNT(*) as total_finales 
      FROM evaluaciones_mcer 
      WHERE tipo = 'final'
    `;

    return NextResponse.json({ 
      success: true, 
      data: {
        investigadores: parseInt(investigadores[0].total),
        aprobados: parseInt(aprobados[0].total),
        satisfaccionPromedio: encuestas[0].promedio ? parseFloat(encuestas[0].promedio).toFixed(1) : 0,
        totalEncuestas: parseInt(encuestas[0].total_encuestas),
        audiencia: difusion[0].total_audiencia ? parseInt(difusion[0].total_audiencia) : 0,
        evaluacionesFinales: parseInt(mejorasMcer[0].total_finales)
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
