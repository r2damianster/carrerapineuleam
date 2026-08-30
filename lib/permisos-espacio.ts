import { neon } from '@neondatabase/serverless';
import type { AppSession } from './session';

// ¿Puede este usuario operar (asignar beneficiarios, evaluar MCER, encuestar,
// tomar asistencia) en este espacio? Profesor de vinculación: cualquier espacio
// de vinculación (respaldo). Estudiante: solo los espacios donde está asignado
// como instructor en espacio_instructores.
export async function puedeOperarEspacio(usuario: AppSession, espacio_id: number): Promise<boolean> {
  if (['profesor', 'admin'].includes(usuario.rol) && usuario.modulos_acceso.includes('vinculacion')) {
    return true;
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
