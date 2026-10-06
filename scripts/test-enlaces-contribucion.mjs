// scripts/test-enlaces-contribucion.mjs
// Prueba end-to-end (HTTP real contra servidor local + Neon real) del flujo de contribuciones por
// enlace/QR: solo un docente genera el enlace, el externo envía sin login, el envío nace pendiente,
// lo aprueba/rechaza solo quien generó el enlace (o admin) y las estadísticas no lo cuentan.
//
//   node --env-file=.env.local scripts/test-enlaces-contribucion.mjs [urlBase]
//
// Requiere `next dev -p 3100`. Crea enlaces y contribuciones con prefijo test_enlace_ y los borra al
// terminar, aunque falle.

import { neon } from '@neondatabase/serverless';
import { signSession } from './_lib-sign-session.mjs';

const URL_BASE = process.argv[2] ?? 'http://localhost:3100';
const sql = neon(process.env.DATABASE_URL);

let fallos = 0;
function verificar(descripcion, condicion, detalle = '') {
  if (!condicion) fallos++;
  console.log(`${condicion ? 'OK   ' : 'FALLA'} ${descripcion}${condicion ? '' : `  → ${detalle}`}`);
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

async function sesionDeUsuario(correo) {
  const [usuario] = await sql`SELECT id, email, nombres, rol, modulos_acceso FROM usuarios WHERE email = ${correo}`;
  return { id: String(usuario.id), email: usuario.email, nombres: usuario.nombres, rol: usuario.rol, modulos_acceso: usuario.modulos_acceso ?? [] };
}

const manana = () => { const f = new Date(); f.setDate(f.getDate() + 3); return f.toISOString().slice(0, 10) + 'T23:59:59'; };

function envio(titulo, autores, extra = {}) {
  return {
    tipoPublicacion: 'ARTICULO_REGIONAL', // el servidor debe ignorarlo y usar el del enlace
    titulo,
    fechaPublicacion: '2026-09-01',
    campoDetallado: 'Educación',
    estado: 'PUBLICADO',
    lineaInvestigacion: 'Educación y Nuevos Escenarios de la Formación Profesional',
    authors: autores,
    registradorExternoNombre: 'Estudiante de Prueba',
    registradorExternoContacto: 'prueba@example.com',
    ...extra,
  };
}

async function limpiar() {
  await sql`DELETE FROM "Contribution" WHERE titulo LIKE 'test_enlace_%'`;
  await sql`DELETE FROM enlaces_contribucion WHERE nombre_invitado LIKE 'test_enlace_%'`;
}

async function main() {
  await limpiar();
  const arturo = await sesionDeUsuario('arturo.rodriguez@uleam.edu.ec');
  const cintya = await sesionDeUsuario('cintya.zambrano@uleam.edu.ec').catch(() => null);
  const cookieArturo = await cookieDe(arturo);

  // Otro docente cualquiera (no el creador del enlace) para probar que no puede aprobar.
  const [otro] = await sql`SELECT email FROM usuarios WHERE rol = 'profesor' AND activado = true AND id <> ${Number(arturo.id)} AND NOT ('admin' = ANY(modulos_acceso)) ORDER BY id LIMIT 1`;
  const cookieOtroDocente = await cookieDe(await sesionDeUsuario(otro.email));

  try {
    console.log('\n— Solo un docente genera el enlace —');
    const cuerpoValido = { nombre_invitado: 'test_enlace_a', tipo_publicacion: 'LIBRO', docente_es_autor: true, docente_orden: 2, expira_en: manana(), uso_unico: true };
    for (const rol of ['estudiante', 'colaborador', 'secretaria']) {
      const cookie = await cookieDe({ id: '999999', email: 'x@x.x', nombres: 'X', rol, modulos_acceso: [] });
      const r = await llamar('/api/enlaces-contribucion', { cookie, metodo: 'POST', cuerpo: cuerpoValido });
      verificar(`${rol} NO puede generar el enlace (401)`, r.estado === 401, `estado ${r.estado}`);
    }
    const sinSesion = await llamar('/api/enlaces-contribucion', { metodo: 'POST', cuerpo: cuerpoValido });
    verificar('sin sesión NO puede generar el enlace (401)', sinSesion.estado === 401, `estado ${sinSesion.estado}`);

    console.log('\n— Validaciones al generar —');
    let r = await llamar('/api/enlaces-contribucion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ...cuerpoValido, tipo_publicacion: 'NADA' } });
    verificar('tipo de contribución inválido → 400', r.estado === 400, `estado ${r.estado}`);
    r = await llamar('/api/enlaces-contribucion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ...cuerpoValido, docente_orden: 9 } });
    verificar('orden de autoría fuera de 1..5 → 400', r.estado === 400, `estado ${r.estado}`);
    r = await llamar('/api/enlaces-contribucion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ...cuerpoValido, expira_en: '2020-01-01T00:00:00' } });
    verificar('fecha de expiración pasada → 400', r.estado === 400, `estado ${r.estado}`);

    console.log('\n— El docente genera el enlace (Libro, autor #2, un solo uso) —');
    r = await llamar('/api/enlaces-contribucion', { cookie: cookieArturo, metodo: 'POST', cuerpo: cuerpoValido });
    verificar('docente genera el enlace (201)', r.estado === 201 && !!r.datos?.data?.token, `estado ${r.estado}`);
    const token = r.datos?.data?.token;

    console.log('\n— Información pública del enlace (sin login) —');
    r = await llamar(`/api/enlaces-contribucion/${token}`);
    verificar('GET público devuelve el tipo fijado por el docente', r.estado === 200 && r.datos?.data?.tipo_publicacion === 'LIBRO', JSON.stringify(r.datos));
    verificar('GET público trae al docente como autor #2', r.datos?.data?.docente_autor?.orden === 2 && /Arturo/.test(r.datos?.data?.docente_autor?.nombre ?? ''), JSON.stringify(r.datos?.data?.docente_autor));
    r = await llamar('/api/enlaces-contribucion/no-es-un-uuid');
    verificar('token mal formado → 404 (no error 500)', r.estado === 404, `estado ${r.estado}`);

    console.log('\n— Autocompletar protegido por el token —');
    r = await llamar(`/api/enlaces-contribucion/${token}/extract-doi`, { metodo: 'POST', cuerpo: {} });
    verificar('extract-doi con token vigente (sin DOI) → 400, no 410/401', r.estado === 400, `estado ${r.estado}`);
    r = await llamar('/api/enlaces-contribucion/00000000-0000-4000-8000-000000000000/extract-doi', { metodo: 'POST', cuerpo: { doi: '10.1/x' } });
    verificar('extract-doi con token inexistente → 410', r.estado === 410, `estado ${r.estado}`);

    console.log('\n— Validaciones del envío externo —');
    const autoresOk = [
      { authorName: 'Estudiante Externo', order: 1, isCarreraAuthor: false, esEstudiante: false },
      { authorName: 'Arturo Damián Rodríguez Zambrano', order: 2, isCarreraAuthor: true, esEstudiante: false },
    ];
    r = await llamar(`/api/enlaces-contribucion/${token}`, { metodo: 'POST', cuerpo: envio('test_enlace_libro', autoresOk, { registradorExternoNombre: '  ' }) });
    verificar('sin nombre de quien envía → 400', r.estado === 400, `estado ${r.estado}`);
    r = await llamar(`/api/enlaces-contribucion/${token}`, { metodo: 'POST', cuerpo: envio('test_enlace_libro', [{ ...autoresOk[0], order: 2 }, autoresOk[1]]) });
    verificar('dos autores con el mismo orden → 400', r.estado === 400, `estado ${r.estado}`);
    const seis = Array.from({ length: 6 }, (_, i) => ({ authorName: `A${i}`, order: Math.min(i + 1, 5), isCarreraAuthor: false, esEstudiante: false }));
    r = await llamar(`/api/enlaces-contribucion/${token}`, { metodo: 'POST', cuerpo: envio('test_enlace_libro', seis) });
    verificar('más de 5 autores → 400', r.estado === 400, `estado ${r.estado}`);
    const [usosTrasErrores] = await sql`SELECT usos_actuales FROM enlaces_contribucion WHERE token = ${token}::uuid`;
    verificar('los envíos inválidos NO gastan el enlace de un solo uso', Number(usosTrasErrores.usos_actuales) === 0, `usos ${usosTrasErrores.usos_actuales}`);

    console.log('\n— Envío válido —');
    r = await llamar(`/api/enlaces-contribucion/${token}`, { metodo: 'POST', cuerpo: envio('test_enlace_libro', autoresOk) });
    verificar('el externo envía sin login (201)', r.estado === 201, `estado ${r.estado} ${JSON.stringify(r.datos)}`);

    const [fila] = await sql`SELECT id, "tipoPublicacion", "origen", "aprobada", "creadoPorId", "registradorExternoNombre", "registradorExternoContacto" FROM "Contribution" WHERE titulo = 'test_enlace_libro'`;
    verificar('el tipo lo fija el enlace (LIBRO), no lo que mandó el cliente', fila?.tipoPublicacion === 'LIBRO', fila?.tipoPublicacion);
    verificar('nace pendiente: origen=enlace_externo, aprobada=false', fila?.origen === 'enlace_externo' && fila?.aprobada === false, JSON.stringify(fila));
    verificar('creadoPorId = el docente que generó el enlace', Number(fila?.creadoPorId) === Number(arturo.id), String(fila?.creadoPorId));
    verificar('guarda quién lo envió y su contacto', fila?.registradorExternoNombre === 'Estudiante de Prueba' && fila?.registradorExternoContacto === 'prueba@example.com');
    const autores = await sql`SELECT "authorName", "order" FROM "ContributionAuthor" WHERE "contributionId" = ${fila.id} ORDER BY "order"`;
    verificar('autores guardados: externo #1 y docente #2', autores.length === 2 && autores[0].order === 1 && autores[1].order === 2 && /Arturo/.test(autores[1].authorName), JSON.stringify(autores));

    console.log('\n— Un solo uso —');
    r = await llamar(`/api/enlaces-contribucion/${token}`, { metodo: 'POST', cuerpo: envio('test_enlace_libro_2', autoresOk) });
    verificar('segundo envío con enlace de un solo uso → 410', r.estado === 410, `estado ${r.estado}`);
    r = await llamar(`/api/enlaces-contribucion/${token}`);
    verificar('GET del enlace agotado → 410', r.estado === 410, `estado ${r.estado}`);

    console.log('\n— Moderación —');
    r = await llamar('/api/contribuciones', { cookie: cookieArturo });
    const enLista = (r.datos ?? []).find(c => c.id === fila.id);
    verificar('el docente creador ve el envío con _puedeAprobar=true', enLista?._puedeAprobar === true && enLista?.aprobada === false, JSON.stringify(enLista && { a: enLista.aprobada, p: enLista._puedeAprobar }));
    r = await llamar('/api/contribuciones', { cookie: cookieOtroDocente });
    verificar('otro docente lo ve pero con _puedeAprobar=false', (r.datos ?? []).find(c => c.id === fila.id)?._puedeAprobar === false);
    r = await llamar(`/api/contribuciones/${fila.id}/aprobar`, { cookie: cookieOtroDocente, metodo: 'POST', cuerpo: { accion: 'aprobar' } });
    verificar('otro docente NO puede aprobar (403)', r.estado === 403, `estado ${r.estado}`);
    r = await llamar(`/api/contribuciones/${fila.id}/aprobar`, { metodo: 'POST', cuerpo: { accion: 'aprobar' } });
    verificar('sin sesión NO puede aprobar (401)', r.estado === 401, `estado ${r.estado}`);

    r = await llamar('/api/notificaciones', { cookie: cookieArturo });
    verificar('el docente creador recibe la notificación contribuciones-por-aprobar', JSON.stringify(r.datos ?? {}).includes('contribuciones-por-aprobar'), `estado ${r.estado}`);

    r = await llamar(`/api/contribuciones/${fila.id}/aprobar`, { cookie: cookieArturo, metodo: 'POST', cuerpo: { accion: 'aprobar' } });
    verificar('el docente creador aprueba (200)', r.estado === 200, `estado ${r.estado}`);
    const [aprobada] = await sql`SELECT "aprobada", "validadoPor", "fechaValidacion" FROM "Contribution" WHERE id = ${fila.id}`;
    verificar('queda aprobada, con validadoPor y fecha', aprobada.aprobada === true && aprobada.validadoPor === arturo.id && !!aprobada.fechaValidacion, JSON.stringify(aprobada));
    r = await llamar(`/api/contribuciones/${fila.id}/aprobar`, { cookie: cookieArturo, metodo: 'POST', cuerpo: { accion: 'rechazar' } });
    verificar('una contribución ya aprobada NO se puede rechazar/borrar por esta vía (403)', r.estado === 403, `estado ${r.estado}`);

    console.log('\n— Rechazar, revocar y reutilización —');
    r = await llamar('/api/enlaces-contribucion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { nombre_invitado: 'test_enlace_b', tipo_publicacion: 'ARTICULO_ALTO_IMPACTO', docente_es_autor: false, expira_en: manana(), uso_unico: false } });
    const tokenB = r.datos?.data?.token;
    r = await llamar(`/api/enlaces-contribucion/${tokenB}`);
    verificar('enlace sin autoría del docente: docente_autor = null', r.estado === 200 && r.datos?.data?.docente_autor === null, JSON.stringify(r.datos?.data));
    const autoresB = [{ authorName: 'Otra Persona', order: 1, isCarreraAuthor: false, esEstudiante: false }];
    for (const n of [1, 2]) {
      r = await llamar(`/api/enlaces-contribucion/${tokenB}`, { metodo: 'POST', cuerpo: envio(`test_enlace_art_${n}`, autoresB) });
      verificar(`enlace reutilizable acepta el envío #${n} (201)`, r.estado === 201, `estado ${r.estado}`);
    }
    const [artRechazar] = await sql`SELECT id FROM "Contribution" WHERE titulo = 'test_enlace_art_1'`;
    r = await llamar(`/api/contribuciones/${artRechazar.id}/aprobar`, { cookie: cookieArturo, metodo: 'POST', cuerpo: { accion: 'rechazar' } });
    const [borrada] = await sql`SELECT id FROM "Contribution" WHERE id = ${artRechazar.id}`;
    verificar('rechazar elimina el envío pendiente', r.estado === 200 && !borrada, `estado ${r.estado}`);

    r = await llamar(`/api/enlaces-contribucion/${tokenB}`, { cookie: cookieOtroDocente, metodo: 'PATCH' });
    verificar('otro docente NO puede revocar un enlace ajeno (404)', r.estado === 404, `estado ${r.estado}`);
    r = await llamar(`/api/enlaces-contribucion/${tokenB}`, { cookie: cookieArturo, metodo: 'PATCH' });
    verificar('el creador revoca su enlace (200)', r.estado === 200, `estado ${r.estado}`);
    r = await llamar(`/api/enlaces-contribucion/${tokenB}`);
    verificar('enlace revocado → 410', r.estado === 410, `estado ${r.estado}`);
    r = await llamar(`/api/enlaces-contribucion/${tokenB}`, { metodo: 'POST', cuerpo: envio('test_enlace_art_3', autoresB) });
    verificar('enviar con un enlace revocado → 410', r.estado === 410, `estado ${r.estado}`);

    console.log('\n— Estadísticas: solo cuentan las aprobadas —');
    const [pendientesContadas] = await sql`SELECT count(*)::int AS n FROM "Contribution" WHERE titulo = 'test_enlace_art_2' AND aprobada = false`;
    verificar('queda 1 envío pendiente (test_enlace_art_2)', pendientesContadas.n === 1);
    r = await llamar('/api/admin/stats', { cookie: cookieArturo });
    verificar('GET /api/admin/stats responde 200 con el filtro aprobada=true', r.estado === 200, `estado ${r.estado}`);
    void cintya;
  } finally {
    await limpiar();
  }

  console.log(fallos === 0 ? '\nTodo OK' : `\n${fallos} verificación(es) fallaron`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (error) => { console.error(error); await limpiar().catch(() => {}); process.exit(1); });
