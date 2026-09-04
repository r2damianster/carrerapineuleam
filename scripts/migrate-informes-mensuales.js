import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Historial de informes mensuales generados desde /investigacion/informes.
// No persiste el .docx (igual que el resto de /utilidades) — solo registra
// qué se generó, para poder listar "informes generados" al usuario.
// Aplicado directamente vía Neon MCP en la sesión que introdujo el módulo;
// este script queda como referencia idéntica al cambio ya aplicado en producción.

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS informes_mensuales_generados (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      periodo_desde DATE NOT NULL,
      periodo_hasta DATE NOT NULL,
      actividades_ids INTEGER[] DEFAULT '{}',
      publicaciones_ids TEXT[] DEFAULT '{}',
      podcasts_ids TEXT[] DEFAULT '{}',
      generado_en TIMESTAMPTZ DEFAULT now()
    );
  `;
  console.log('informes_mensuales_generados: tabla creada/verificada');
}
run().catch(e => { console.error(e); process.exit(1); });
