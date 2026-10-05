import type { NeonQueryFunction } from '@neondatabase/serverless';

type ResultadoAula = { ok: true; aulaId: number | null } | { ok: false; error: string };

// Si el espacio usa subaulas, todo beneficiario que se inscribe debe quedar en una aula
// válida (activa y de ese mismo espacio); si no las usa, no se guarda aula.
export async function resolverAulaInscripcion(
  sql: NeonQueryFunction<false, false>,
  espacioId: number,
  aulaId: unknown
): Promise<ResultadoAula> {
  const [espacio] = await sql`SELECT usa_aulas FROM "espacios_enseñanza" WHERE id = ${espacioId}`;
  if (!espacio?.usa_aulas) return { ok: true, aulaId: null };

  if (!aulaId) return { ok: false, error: 'Selecciona el aula del beneficiario' };
  const aulaIdNumero = Number(aulaId);
  const [aula] = await sql`
    SELECT id FROM aulas WHERE id = ${aulaIdNumero} AND espacio_id = ${espacioId} AND activa = true
  `;
  if (!aula) return { ok: false, error: 'El aula elegida no es válida para este espacio' };
  return { ok: true, aulaId: aulaIdNumero };
}
