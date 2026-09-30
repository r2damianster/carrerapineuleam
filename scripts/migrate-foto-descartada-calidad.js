// foto_descartada(url) ahora también es true si la foto quedó marcada de mala calidad o con menores.
// Antes solo miraba `descartada`, y aprobar una asistencia con "mala calidad" dejaba calidad='mala'
// sin descartada=true → la foto seguía saliendo en los informes de Vinculación.
// Uso: node --env-file=.env.local scripts/migrate-foto-descartada-calidad.js
// ROLLBACK: reejecutar scripts/migrate-fotos-descartada.js paso [2] (definición original).
const { neon } = require('@neondatabase/serverless');

(async () => {
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    CREATE OR REPLACE FUNCTION foto_descartada(p_url text) RETURNS boolean
    LANGUAGE sql STABLE AS $$
      SELECT p_url IS NOT NULL AND EXISTS (
        SELECT 1 FROM fotos WHERE url = p_url AND (descartada OR calidad = 'mala' OR menores = 'si')
      )
    $$`;
  const [{ prueba }] = await sql`SELECT foto_descartada('https://no-existe.example/x.jpg') AS prueba`;
  console.log('función OK, url inexistente =', prueba, '(debe ser false)');
})();
