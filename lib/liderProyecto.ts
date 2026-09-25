// Líder de cada proyecto: fuente única = rol 'lider' en proyecto_miembros (Sesión 51).
// Las columnas proyectos.lider_id / lider_nombre / lider_email / lider_orcid quedaron heredadas: ya no se
// escriben; los GET las rellenan con estos datos para no romper a los consumidores existentes.
// El correo y el ORCID salen de la tarjeta pública (members), nunca del correo interno de usuarios.

export interface LiderProyecto {
  usuario_id: number;
  nombre: string;
  email: string | null;
  orcid: string | null;
}

export async function obtenerLideresPorProyecto(sql: any): Promise<Record<string, LiderProyecto>> {
  const filas = await sql`
    SELECT DISTINCT ON (pm.proyecto_id)
           pm.proyecto_id, u.id AS usuario_id, trim(u.nombres || ' ' || u.apellidos) AS nombre,
           NULLIF(m.email, '') AS email, m.orcid
    FROM proyecto_miembros pm
    JOIN usuarios u ON u.id = pm.usuario_id
    LEFT JOIN members m ON m.usuario_id = u.id
    WHERE pm.rol_en_proyecto = 'lider' AND pm.activo
    ORDER BY pm.proyecto_id, pm.orden, pm.id
  `;
  const lideres: Record<string, LiderProyecto> = {};
  for (const fila of filas) {
    lideres[String(fila.proyecto_id)] = {
      usuario_id: Number(fila.usuario_id),
      nombre: String(fila.nombre),
      email: fila.email ?? null,
      orcid: fila.orcid ?? null,
    };
  }
  return lideres;
}

// Devuelve el proyecto con los campos de líder tomados del equipo.
export function conLider<T extends { id?: string }>(proyecto: T, lideres: Record<string, LiderProyecto>) {
  const lider = proyecto.id ? lideres[proyecto.id] : undefined;
  return {
    ...proyecto,
    lider_id: lider ? lider.usuario_id : null,
    lider_nombre: lider ? lider.nombre : null,
    lider_email: lider ? lider.email : null,
    lider_orcid: lider ? lider.orcid : null,
  };
}
