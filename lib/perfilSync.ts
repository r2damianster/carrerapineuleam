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
