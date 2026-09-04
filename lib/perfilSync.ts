import { GRADO_ABREVIADO, POSGRADO_ABREVIADO } from '@/lib/gradosCatalogo';

// Cuando un profesor cambia su perfil (/portal/perfil o /registro) y esos datos
// también viven en la tarjeta pública (`members`), no se escriben directo — quedan
// como propuesta en members.pending_* hasta que contenido_sitio los apruebe desde
// /admin/members (mismo patrón que actividades_difusion.aprobado_sitio). Si el email
// no tiene tarjeta pública curada todavía, no hace nada — el dato ya quedó guardado
// en `usuarios`, que es la fuente que sí puede escribir cualquier profesor.
export async function solicitarPublicacionPerfil(
  sql: any,
  usuarioId: number,
  email: string,
  cambios: { orcid?: string | null; foto_url?: string | null; grado?: string | null; posgrado?: string | null; titulo_especifico?: string | null }
) {
  const [member] = await sql`SELECT id FROM members WHERE email = ${email}`;
  if (!member) return;

  const { orcid, foto_url, grado, posgrado, titulo_especifico } = cambios;
  await sql`
    UPDATE members
    SET pending_photo = COALESCE(${foto_url ?? null}, pending_photo),
        pending_grado = COALESCE(${grado ?? null}, pending_grado),
        pending_posgrado = COALESCE(${posgrado ?? null}, pending_posgrado),
        pending_orcid = COALESCE(${orcid ?? null}, pending_orcid),
        pending_titulo_especifico = COALESCE(${titulo_especifico ?? null}, pending_titulo_especifico),
        pending_solicitado_por = ${usuarioId},
        pending_fecha_solicitud = now()
    WHERE id = ${member.id}
  `;
}

// Tras crear/editar/borrar un título académico (perfiles_titulos_academicos),
// recalcula cuál es el principal de cada nivel y sincroniza:
//   usuarios.titulo_grado/post_grado — inmediato, sin aprobación (uso interno,
//   documentos de /utilidades).
//   members.pending_grado/posgrado/titulo_especifico — vía solicitarPublicacionPerfil,
//   queda pendiente de aprobación (tarjeta pública).
// No puede vivir dentro de app/api/perfil/titulos/route.ts — Next.js rechaza el build
// si un route.ts exporta algo además de los handlers HTTP.
export async function sincronizarTitulos(sql: any, usuarioId: number, email: string) {
  const [tercerNivel] = await sql`
    SELECT tipo FROM perfiles_titulos_academicos
    WHERE usuario_id = ${usuarioId} AND nivel = 'tercer_nivel' AND es_principal = true
    LIMIT 1
  `;
  const [cuartoNivel] = await sql`
    SELECT tipo, titulo_especifico FROM perfiles_titulos_academicos
    WHERE usuario_id = ${usuarioId} AND nivel = 'cuarto_nivel' AND es_principal = true
    LIMIT 1
  `;

  const titulo_grado = tercerNivel ? (GRADO_ABREVIADO[tercerNivel.tipo] ?? tercerNivel.tipo) : null;
  const post_grado = cuartoNivel ? (POSGRADO_ABREVIADO[cuartoNivel.tipo] ?? cuartoNivel.tipo) : null;

  await sql`
    UPDATE usuarios
    SET titulo_grado = COALESCE(${titulo_grado}, titulo_grado),
        post_grado = COALESCE(${post_grado}, post_grado)
    WHERE id = ${usuarioId}
  `;

  await solicitarPublicacionPerfil(sql, usuarioId, email, {
    grado: tercerNivel?.tipo ?? undefined,
    posgrado: cuartoNivel?.tipo ?? undefined,
    titulo_especifico: cuartoNivel?.titulo_especifico ?? undefined,
  });
}
