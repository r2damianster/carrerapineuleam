import { neon } from '@neondatabase/serverless';
import type { AppSession } from './session';
import { esLiderVinculacion } from './modulos';

// ¿Puede este usuario operar (asignar beneficiarios, evaluar MCER, encuestar,
// tomar asistencia) en este espacio? Profesor con módulo vinculacion: solo los espacios
// que supervisa (espacios_enseñanza.profesor_id = él); el líder de Vinculación y el
// superadmin operan cualquiera. Estudiante: solo los espacios donde está asignado
// como instructor en espacio_instructores.
export async function puedeOperarEspacio(usuario: AppSession, espacio_id: number): Promise<boolean> {
  if (['profesor', 'admin'].includes(usuario.rol) && esLiderVinculacion(usuario)) {
    return true;
  }
  if (['profesor', 'admin'].includes(usuario.rol) && usuario.modulos_acceso.includes('vinculacion')) {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT 1 FROM "espacios_enseñanza"
      WHERE id = ${espacio_id} AND profesor_id = ${Number(usuario.id)}
    `;
    return rows.length > 0;
  }
  if (usuario.rol === 'estudiante') {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT 1 FROM espacio_instructores
      WHERE espacio_id = ${espacio_id} AND usuario_id = ${usuario.id}
    `;
    return rows.length > 0;
  }
  return false;
}
