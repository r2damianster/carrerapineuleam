// scripts/test-permisos-pertenencia.mjs — Sesión 53 (H1)
// Prueba end-to-end, contra un servidor local (npm run dev) y la Neon real, de la reconexión de
// lib/permisosPertenencia.ts: PATCH /api/admin/roles y POST /api/members deben recalcular
// modulos_acceso a partir de proyecto_miembros + modulos_manuales − modulos_excluidos.
//
//   node --env-file=.env.local scripts/test-permisos-pertenencia.mjs [urlBase]
//
// Crea un usuario y una tarjeta de equipo de prueba (prefijo test_h1_) y los borra al terminar,
// aunque falle. No toca ninguna persona real.

import { neon } from '@neondatabase/serverless';
import { signSession } from './_lib-sign-session.mjs';

const URL_BASE = process.argv[2] ?? 'http://localhost:3100';
const sql = neon(process.env.DATABASE_URL);

let fallos = 0;
function verificar(descripcion, condicion, detalle = '') {
  const marca = condicion ? 'OK   ' : 'FALLA';
  if (!condicion) fallos++;
  console.log(`${marca} ${descripcion}${condicion ? '' : `  → ${detalle}`}`);
}

async function cookieDe(sesion) {
  return `pine_app_session=${await signSession(sesion)}`;
}

async function llamar(ruta, { cookie, metodo = 'GET', cuerpo } = {}) {
  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let datos = null;
  try { datos = await respuesta.json(); } catch { /* sin cuerpo JSON */ }
  return { estado: respuesta.status, datos };
}

async function limpiar(usuarioId) {
  await sql`DELETE FROM members WHERE usuario_id = ${usuarioId}`;
  await sql`DELETE FROM proyecto_miembros WHERE usuario_id = ${usuarioId}`;
  await sql`DELETE FROM usuarios WHERE id = ${usuarioId}`;
}

async function main() {
  const [arturo] = await sql`SELECT id, email, nombres, rol, modulos_acceso FROM usuarios WHERE email = 'arturo.rodriguez@uleam.edu.ec'`;
  const cookieArturo = await cookieDe({ id: String(arturo.id), email: arturo.email, nombres: arturo.nombres, rol: arturo.rol, modulos_acceso: arturo.modulos_acceso ?? [] });

  const [nuevo] = await sql`
    INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, activado, modulos_acceso, modulos_manuales, modulos_excluidos)
    VALUES ('Test H1', 'Pertenencia', ${'test_h1_' + Date.now() + '@sin-email.pine'},
            (SELECT password_hash FROM usuarios WHERE rol IS NULL AND activado = false LIMIT 1),
            'profesor', false, '{}', '{}', '{}')
    RETURNING id`;
  const usuarioId = Number(nuevo.id);

  try {
    console.log('\n— PATCH /api/admin/roles deriva de proyecto_miembros —');
    await sql`INSERT INTO proyecto_miembros (proyecto_id, usuario_id, rol_en_proyecto, activo) VALUES ('vinculacion', ${usuarioId}, 'lider', true)`;

    let r = await llamar('/api/admin/roles', { cookie: cookieArturo, metodo: 'PATCH', cuerpo: { id: usuarioId, modulos: [] } });
    verificar('sin nada marcado en la UI → los derivados (líder de vinculación) quedan excluidos a propósito', r.estado === 200 && (r.datos?.modulos_acceso ?? []).length === 0, JSON.stringify(r.datos));
    let [fila] = await sql`SELECT modulos_acceso, modulos_manuales, modulos_excluidos FROM usuarios WHERE id = ${usuarioId}`;
    verificar('  …modulos_excluidos guarda ambos derivados', ['vinculacion', 'vinculacion_gestion'].every((m) => fila.modulos_excluidos.includes(m)), JSON.stringify(fila));

    r = await llamar('/api/admin/roles', { cookie: cookieArturo, metodo: 'PATCH', cuerpo: { id: usuarioId, modulos: ['vinculacion', 'vinculacion_gestion', 'contenido_sitio'] } });
    const efectivo1 = (r.datos?.modulos_acceso ?? []).sort();
    verificar('marcando los derivados + uno manual → efectivo = los 3', r.estado === 200 && JSON.stringify(efectivo1) === JSON.stringify(['contenido_sitio', 'vinculacion', 'vinculacion_gestion'].sort()), JSON.stringify(efectivo1));
    [fila] = await sql`SELECT modulos_manuales, modulos_excluidos FROM usuarios WHERE id = ${usuarioId}`;
    verificar('  …solo "contenido_sitio" quedó como manual (los otros dos se derivan solos)', JSON.stringify(fila.modulos_manuales) === JSON.stringify(['contenido_sitio']), JSON.stringify(fila));
    verificar('  …modulos_excluidos quedó vacío (ya no hay nada que excluir)', fila.modulos_excluidos.length === 0, JSON.stringify(fila));

    console.log('\n— POST /api/members también recalcula (deja de ser líder → pierde lo derivado, conserva lo manual) —');
    r = await llamar('/api/members', {
      cookie: cookieArturo, metodo: 'POST',
      cuerpo: { name: 'Test H1 Pertenencia', role: 'Prueba', email: 'test_h1@sin-email.pine', usuario_id: usuarioId, order: 999, projects: ['vinculacion'], roles_proyecto: { vinculacion: 'participante' } },
    });
    verificar('crear tarjeta de equipo con rol "participante" (ya no líder) → 200/201', [200, 201].includes(r.estado), JSON.stringify(r.datos));
    [fila] = await sql`SELECT modulos_acceso FROM usuarios WHERE id = ${usuarioId}`;
    verificar('  …pierde vinculacion/vinculacion_gestion (ya no derivan) pero conserva contenido_sitio (manual)', JSON.stringify((fila.modulos_acceso ?? []).sort()) === JSON.stringify(['contenido_sitio']), JSON.stringify(fila));

    console.log('\n— Pasante no deriva nada (sigue como antes) —');
    await sql`UPDATE usuarios SET rol = 'estudiante' WHERE id = ${usuarioId}`;
    r = await llamar('/api/admin/roles', { cookie: cookieArturo, metodo: 'PATCH', cuerpo: { id: usuarioId, modulos: ['subir_video'] } });
    verificar('pasante: PATCH normal, sin tocar derivación → 200 con subir_video', r.estado === 200 && JSON.stringify(r.datos?.modulos_acceso) === JSON.stringify(['subir_video']), JSON.stringify(r.datos));
  } finally {
    await limpiar(usuarioId);
  }
}

main()
  .catch((error) => { console.error('ERROR inesperado:', error); fallos++; })
  .finally(() => {
    console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} caso(s) FALLARON`);
    process.exit(fallos === 0 ? 0 : 1);
  });
