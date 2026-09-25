// Equipos por proyecto (Sesión 51): enlaza members (tarjeta pública) con usuarios (persona) y crea
// proyecto_miembros como fuente única de "quién está en qué proyecto y con qué rol".
// Aplicado en producción vía Neon MCP el 2026-09-25 (transacción única). Idempotente.
// members.projects / project_order quedan como columnas heredadas: ya no las lee ni escribe el código.
const { neon } = require('@neondatabase/serverless');
(async () => {
  const sql = neon(process.env.DATABASE_URL);

  // 1. Personas de directorio (sin rol ni login) para las tarjetas que no tenían cuenta.
  await sql`
    INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, activado, modulos_acceso)
    SELECT v.nombres, v.apellidos, v.email, (SELECT password_hash FROM usuarios WHERE rol IS NULL AND activado = false LIMIT 1), NULL, false, '{}'
    FROM (VALUES
      ('Johana','Bello','externo.johana.bello@sin-email.pine'),
      ('Andy','Castillo','externo.andy.castillo@sin-email.pine'),
      ('Josselyn','Mera Rivas','externo.josselyn.mera@sin-email.pine'),
      ('Ailys Jordana','Bailón Borja','externo.ailys.bailon@sin-email.pine'),
      ('Doménica Valeska','Vélez Bravo','externo.domenica.velez@sin-email.pine'),
      ('Diana Noemi','Cedeño Sánchez','externo.diana.cedeno@sin-email.pine')
    ) AS v(nombres, apellidos, email)
    WHERE NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.email = v.email)`;

  // 2. Enlace members -> usuarios.
  await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS members_usuario_id_uq ON members(usuario_id) WHERE usuario_id IS NOT NULL`;
  await sql`UPDATE members m SET usuario_id = u.id FROM usuarios u WHERE m.usuario_id IS NULL AND m.email <> '' AND lower(u.email) = lower(m.email)`;
  await sql`UPDATE members SET usuario_id = 14 WHERE id = 'member_3' AND usuario_id IS NULL`;   // Cristina Basantes
  await sql`UPDATE members SET usuario_id = 8 WHERE id = 'member_11' AND usuario_id IS NULL`;   // Cintya Zambrano
  await sql`
    UPDATE members m SET usuario_id = u.id FROM usuarios u
    WHERE m.usuario_id IS NULL AND (
      (m.id='member_4' AND u.email='externo.johana.bello@sin-email.pine') OR
      (m.id='member_5' AND u.email='externo.andy.castillo@sin-email.pine') OR
      (m.id='member_6' AND u.email='externo.josselyn.mera@sin-email.pine') OR
      (m.id='member_8' AND u.email='externo.ailys.bailon@sin-email.pine') OR
      (m.id='member_7' AND u.email='externo.domenica.velez@sin-email.pine') OR
      (m.id='member_9' AND u.email='externo.diana.cedeno@sin-email.pine'))`;
  await sql`UPDATE members m SET email = u.email FROM usuarios u WHERE u.id = m.usuario_id AND m.email = '' AND u.email NOT LIKE '%@sin-email.pine'`;
  await sql`UPDATE members m SET name = trim(u.nombres || ' ' || u.apellidos), updated = now() FROM usuarios u WHERE u.id = m.usuario_id`;

  // 3. Tabla de pertenencia con rol por proyecto.
  await sql`
    CREATE TABLE IF NOT EXISTS proyecto_miembros (
      id SERIAL PRIMARY KEY,
      proyecto_id TEXT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      rol_en_proyecto TEXT NOT NULL DEFAULT 'participante' CHECK (rol_en_proyecto IN ('lider','colider','supervisor','vinculacion','participante')),
      orden INTEGER NOT NULL DEFAULT 0,
      activo BOOLEAN NOT NULL DEFAULT true,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (proyecto_id, usuario_id))`;
  await sql`CREATE INDEX IF NOT EXISTS proyecto_miembros_proyecto_idx ON proyecto_miembros(proyecto_id, orden)`;

  // 4. Respaldo de lo que hoy se muestra (mismo rol y orden que la lógica anterior de TeamSection).
  await sql`
    INSERT INTO proyecto_miembros (proyecto_id, usuario_id, rol_en_proyecto, orden, activo)
    SELECT p.proyecto_id, m.usuario_id,
           CASE WHEN p.proyecto_id='vinculacion' AND m.id='member_1' THEN 'supervisor'
                WHEN p.proyecto_id='desarrollo_habilidades' AND m.id='member_3' THEN 'colider'
                WHEN m.is_leader THEN 'lider'
                WHEN m."order" = 2 THEN 'colider'
                WHEN m.id='member_7' THEN 'vinculacion'
                ELSE 'participante' END,
           COALESCE((m.project_order->>p.proyecto_id)::int, m."order"), m.activo
    FROM members m CROSS JOIN LATERAL unnest(m.projects) AS p(proyecto_id)
    WHERE m.usuario_id IS NOT NULL AND EXISTS (SELECT 1 FROM proyectos pr WHERE pr.id = p.proyecto_id)
    ON CONFLICT (proyecto_id, usuario_id) DO NOTHING`;

  // 5. Líder del proyecto desde su correo.
  await sql`UPDATE proyectos pr SET lider_id = u.id, lider_nombre = trim(u.nombres || ' ' || u.apellidos) FROM usuarios u WHERE pr.lider_email IS NOT NULL AND lower(u.email) = lower(pr.lider_email)`;
  console.log('OK');
})();
