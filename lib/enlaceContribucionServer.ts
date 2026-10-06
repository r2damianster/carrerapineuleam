import { neon } from '@neondatabase/serverless';
import { esTokenValido, motivoEnlaceNoVigente } from '@/lib/enlaceContribucion';

// true si el token existe y sigue vigente (activo, no vencido, con usos disponibles).
// Lo usan las rutas públicas de autocompletado (DOI/PDF): la IA tiene costo, así que
// solo se atiende a quien tenga un enlace vivo. No consume usos.
export async function enlaceContribucionVigente(token: string): Promise<boolean> {
  if (!esTokenValido(token)) return false;
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
  const [enlace] = await sql`
    SELECT expira_en, max_usos, usos_actuales, activo
    FROM enlaces_contribucion WHERE token = ${token}::uuid
  `;
  return !!enlace && motivoEnlaceNoVigente(enlace as any) === null;
}
