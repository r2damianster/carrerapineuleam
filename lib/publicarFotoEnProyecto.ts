// lib/publicarFotoEnProyecto.ts — Sesión 60
// Publica automáticamente la(s) foto(s) de un registro APROBADO en la galería de cada proyecto
// al que pertenece (fotos.proyectos → fotos_ubicaciones.proyecto_id). Un registro con varios
// proyectos entra en todas sus galerías. Nunca toca ubicaciones `solo_admin` (portada), esa es
// curaduría manual de administración del sitio.
//
// Solo publica fotos elegibles: activas, no descartadas, sin menores, publicables y sin marca de
// mala calidad. Sin imports de Node/Neon a nivel de módulo — recibe `sql` desde el handler.

type OrigenFoto = 'asistencia' | 'evento' | 'podcast';

export async function publicarFotosDeFuente(sql: any, origenes: OrigenFoto[], fuenteId: string | number): Promise<void> {
  await sql`
    UPDATE fotos SET
      ubicaciones = ARRAY(
        SELECT DISTINCT ubicacion FROM unnest(
          ubicaciones || ARRAY(
            SELECT u.slug FROM fotos_ubicaciones u
            WHERE u.activo = true AND u.solo_admin = false AND u.proyecto_id = ANY(fotos.proyectos)
          )
        ) AS ubicacion
      ),
      updated = now()
    WHERE origen = ANY(${origenes}::text[])
      AND fuente_id = ${String(fuenteId)}
      AND activo = true AND descartada = false
      AND menores = 'no' AND visibilidad = 'publicable' AND calidad <> 'mala'
  `;
}

// Quita las ubicaciones de galerías de proyecto (deja intactas las `solo_admin`, ej. portada).
export async function retirarFotosDeFuente(sql: any, origenes: OrigenFoto[], fuenteId: string | number): Promise<void> {
  await sql`
    UPDATE fotos SET
      ubicaciones = ARRAY(
        SELECT ubicacion FROM unnest(ubicaciones) AS ubicacion
        WHERE ubicacion NOT IN (SELECT slug FROM fotos_ubicaciones WHERE solo_admin = false)
      ),
      updated = now()
    WHERE origen = ANY(${origenes}::text[]) AND fuente_id = ${String(fuenteId)}
  `;
}
