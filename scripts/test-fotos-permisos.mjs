// scripts/test-fotos-permisos.mjs — WP11 del plan docs/PLAN_IMPLEMENTACION_ANTIGRAVITY_ADMIN_POR_LIDERES.md
//
// Prueba la matriz de permisos del banco de fotos contra un servidor local (npm run dev) y la Neon real.
//   node --env-file=.env.local scripts/test-fotos-permisos.mjs [urlBase]      (por defecto http://localhost:3100)
//
// Crea filas de prueba `foto_test_*` y la ubicación `test-galeria`, y las BORRA al terminar (aunque falle).
// Nunca toca filas reales. Sale con código 1 si algún caso falla.

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

async function usuarioPorEmail(email) {
  const [fila] = await sql`SELECT id, email, nombres, rol, modulos_acceso FROM usuarios WHERE email = ${email}`;
  if (!fila) throw new Error(`No existe el usuario ${email}`);
  return { id: String(fila.id), email: fila.email, nombres: fila.nombres, rol: fila.rol, modulos_acceso: fila.modulos_acceso ?? [] };
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

async function crearFoto(id, { proyectos = [], menores = 'no', visibilidad = 'publicable', ubicaciones = [], origen = 'admin' } = {}) {
  await sql`
    INSERT INTO fotos (id, url, ubicaciones, activo, origen, proyectos, menores, visibilidad)
    VALUES (${id}, ${'https://example.com/' + id + '.jpg'}, ${ubicaciones}, true, ${origen}, ${proyectos}, ${menores}, ${visibilidad})`;
}

async function ubicacionesDe(id) {
  const [fila] = await sql`SELECT ubicaciones FROM fotos WHERE id = ${id}`;
  return fila?.ubicaciones ?? [];
}

async function limpiar() {
  await sql`DELETE FROM fotos WHERE id LIKE 'foto_test_%'`;
  await sql`DELETE FROM fotos_ubicaciones WHERE slug = 'test-galeria'`;
}

async function main() {
  await limpiar(); // por si una corrida anterior quedó a medias

  const arturo = await usuarioPorEmail('arturo.rodriguez@uleam.edu.ec');
  const veronica = await usuarioPorEmail('veronica.chavez@uleam.edu.ec');
  const cristina = await usuarioPorEmail('maria.basantes@uleam.edu.ec').catch(() => null);
  const jhonny = await usuarioPorEmail('jhonny.villafuerte@uleam.edu.ec');
  const [secretariaFila] = await sql`SELECT id, email, nombres, rol, modulos_acceso FROM usuarios WHERE rol = 'secretaria' LIMIT 1`;
  const [pasanteFila] = await sql`SELECT id, email, nombres, rol, modulos_acceso FROM usuarios WHERE rol = 'estudiante' AND activado = true LIMIT 1`;
  const comoSesion = (fila) => ({ id: String(fila.id), email: fila.email, nombres: fila.nombres, rol: fila.rol, modulos_acceso: fila.modulos_acceso ?? [] });

  const cookieArturo = await cookieDe(arturo);
  const cookieVeronica = await cookieDe(veronica);
  const cookieJhonny = await cookieDe(jhonny);
  const cookieSecretaria = secretariaFila ? await cookieDe(comoSesion(secretariaFila)) : null;
  const cookiePasante = pasanteFila ? await cookieDe(comoSesion(pasanteFila)) : null;

  // Datos de prueba
  await crearFoto('foto_test_docencia', { proyectos: ['docencia_innovadora'] });
  await crearFoto('foto_test_redlea', { proyectos: ['redlea'] });
  await crearFoto('foto_test_intl', { proyectos: ['internacionalizacion'] });
  await crearFoto('foto_test_menores', { proyectos: ['docencia_innovadora'], menores: 'revisar', visibilidad: 'interna' });
  await crearFoto('foto_test_sinproyecto', { proyectos: [] });

  console.log('\n— Acceso sin sesión / roles no docentes —');
  verificar('Anónimo: GET /api/photos/banco → 401', (await llamar('/api/photos/banco')).estado === 401);
  verificar('Anónimo: POST /api/photos/accion → 401', (await llamar('/api/photos/accion', { metodo: 'POST', cuerpo: { ids: ['x'], accion: 'ocultar' } })).estado === 401);
  if (cookieSecretaria) {
    verificar('Secretaria: banco → 403', (await llamar('/api/photos/banco', { cookie: cookieSecretaria })).estado === 403);
    verificar('Secretaria: accion → 403', (await llamar('/api/photos/accion', { cookie: cookieSecretaria, metodo: 'POST', cuerpo: { ids: ['foto_test_docencia'], accion: 'ocultar' } })).estado === 403);
  } else console.log('SALTADO secretaria (no hay usuario con rol secretaria)');
  if (cookiePasante) {
    verificar('Pasante: banco → 403', (await llamar('/api/photos/banco', { cookie: cookiePasante })).estado === 403);
    verificar('Pasante: accion → 403', (await llamar('/api/photos/accion', { cookie: cookiePasante, metodo: 'POST', cuerpo: { ids: ['foto_test_docencia'], accion: 'ocultar' } })).estado === 403);
  } else console.log('SALTADO pasante (no hay estudiante activado)');

  console.log('\n— Líder Verónica (líder de docencia_innovadora y mentoring) —');
  let r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_docencia'], accion: 'publicar', ubicaciones: ['docencia-galeria'] } });
  verificar('publica foto de su proyecto en docencia-galeria → 200', r.estado === 200, JSON.stringify(r.datos));
  verificar('  …y quedó en la base', (await ubicacionesDe('foto_test_docencia')).includes('docencia-galeria'));
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_docencia'], accion: 'publicar', ubicaciones: ['redlea-galeria'] } });
  verificar('publicar en redlea-galeria (proyecto ajeno) → 4xx', r.estado === 409 || r.estado === 403, `estado ${r.estado}`);
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_docencia'], accion: 'publicar', ubicaciones: ['portada'] } });
  verificar('publicar en portada → 4xx', r.estado === 409 || r.estado === 403, `estado ${r.estado}`);
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_menores'], accion: 'publicar', ubicaciones: ['docencia-galeria'] } });
  verificar('publicar foto con menores → 409', r.estado === 409, `estado ${r.estado}`);
  verificar('  …y no se modificó', (await ubicacionesDe('foto_test_menores')).length === 0);
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_redlea'], accion: 'ocultar' } });
  verificar('operar foto de otro proyecto → 4xx', r.estado === 409 || r.estado === 403, `estado ${r.estado}`);
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_sinproyecto'], accion: 'ocultar' } });
  verificar('operar foto sin proyecto → 4xx', r.estado === 409 || r.estado === 403, `estado ${r.estado}`);
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_docencia'], accion: 'marcar_revisada' } });
  verificar('acción solo-admin (marcar_revisada) → 403', r.estado === 403, `estado ${r.estado}`);
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_docencia', 'foto_test_redlea'], accion: 'ocultar' } });
  const [ocultaDocencia] = await sql`SELECT activo FROM fotos WHERE id = 'foto_test_docencia'`;
  verificar('lote con una foto ajena: falla y NO modifica ninguna (atomicidad)', (r.estado === 409 || r.estado === 403) && ocultaDocencia.activo === true, `estado ${r.estado}, activo=${ocultaDocencia.activo}`);
  r = await llamar('/api/photos/banco?pageSize=60', { cookie: cookieVeronica });
  const idsVeronica = (r.datos?.items ?? []).map((foto) => foto.id).filter((id) => id.startsWith('foto_test_'));
  verificar('banco de la líder: solo fotos de sus proyectos, sin menores/ajenas/sin proyecto',
    r.estado === 200 && idsVeronica.includes('foto_test_docencia') && !idsVeronica.some((id) => ['foto_test_redlea', 'foto_test_menores', 'foto_test_sinproyecto', 'foto_test_intl'].includes(id)),
    JSON.stringify(idsVeronica));

  console.log('\n— Jhonny (colíder de internacionalizacion, líder de redlea; sin módulos) —');
  r = await llamar('/api/photos/accion', { cookie: cookieJhonny, metodo: 'POST', cuerpo: { ids: ['foto_test_intl'], accion: 'publicar', ubicaciones: ['internacionalizacion-galeria'] } });
  verificar('publica en internacionalizacion-galeria → 200', r.estado === 200, JSON.stringify(r.datos));
  r = await llamar('/api/photos/accion', { cookie: cookieJhonny, metodo: 'POST', cuerpo: { ids: ['foto_test_redlea'], accion: 'publicar', ubicaciones: ['redlea-galeria'] } });
  verificar('publica en redlea-galeria → 200 (si D2 está aplicada)', r.estado === 200, `estado ${r.estado} ${JSON.stringify(r.datos)}`);
  for (const ubicacion of ['portada', 'docencia-galeria', 'club-ingles']) {
    r = await llamar('/api/photos/accion', { cookie: cookieJhonny, metodo: 'POST', cuerpo: { ids: ['foto_test_intl'], accion: 'publicar', ubicaciones: [ubicacion] } });
    verificar(`publicar en ${ubicacion} → 4xx`, r.estado === 409 || r.estado === 403, `estado ${r.estado}`);
  }
  r = await llamar('/api/photos/banco?pageSize=60', { cookie: cookieJhonny });
  const idsJhonny = (r.datos?.items ?? []).map((foto) => foto.id).filter((id) => id.startsWith('foto_test_'));
  verificar('banco de Jhonny: solo internacionalizacion/redlea', idsJhonny.every((id) => ['foto_test_intl', 'foto_test_redlea'].includes(id)) && idsJhonny.length === 2, JSON.stringify(idsJhonny));
  const paginaAdmin = await fetch(`${URL_BASE}/admin/photos`, { headers: { Cookie: cookieJhonny }, redirect: 'manual' });
  verificar('Jhonny: /admin/photos redirige (sin contenido_sitio)', paginaAdmin.status >= 300 && paginaAdmin.status < 400, `estado ${paginaAdmin.status}`);

  console.log('\n— Administración del sitio (Arturo) —');
  r = await llamar('/api/photos/accion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ids: ['foto_test_sinproyecto'], accion: 'publicar', ubicaciones: ['portada'] } });
  verificar('publica en portada → 200', r.estado === 200, JSON.stringify(r.datos));
  r = await llamar('/api/photos/accion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ids: ['foto_test_menores'], accion: 'marcar_revisada' } });
  verificar('marcar_revisada → 200', r.estado === 200, JSON.stringify(r.datos));
  r = await llamar('/api/photos/accion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ids: ['foto_test_docencia', 'foto_test_no_existe'], accion: 'ocultar' } });
  verificar('lote con id inexistente → 400 y nada modificado', r.estado === 400, `estado ${r.estado}`);
  r = await llamar('/api/photos/accion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ids: ['foto_test_docencia'], accion: 'quitar', ubicaciones: ['docencia-galeria'] } });
  verificar('quitar (admin) → 200 (antes fallaba por una función SQL inexistente)', r.estado === 200, JSON.stringify(r.datos));
  verificar('  …y quedó sin esa ubicación', !(await ubicacionesDe('foto_test_docencia')).includes('docencia-galeria'));

  console.log('\n— Base de datos —');
  let errorCheck = null;
  try {
    await crearFoto('foto_test_violacion', { menores: 'revisar', visibilidad: 'interna', ubicaciones: ['portada'] });
  } catch (error) { errorCheck = error; }
  verificar('CHECK: foto con menores no puede tener ubicaciones (23514)', errorCheck?.code === '23514', errorCheck ? errorCheck.message : 'no falló');

  console.log('\n— GET público con tope —');
  await sql`INSERT INTO fotos_ubicaciones (slug, nombre, proyecto_id, max_fotos, solo_admin, orden) VALUES ('test-galeria', 'Galería de prueba', NULL, 3, true, 999)`;
  for (let numero = 1; numero <= 5; numero++) await crearFoto(`foto_test_pub${numero}`, { ubicaciones: ['test-galeria'] });
  r = await llamar('/api/photos?ubicacion=test-galeria');
  verificar('5 fotos publicadas con tope 3 → devuelve 3', Array.isArray(r.datos) && r.datos.length === 3, `devolvió ${Array.isArray(r.datos) ? r.datos.length : r.estado}`);
  r = await llamar('/api/photos?ubicacion=ubicacion_que_no_existe');
  verificar('ubicación inexistente → []', Array.isArray(r.datos) && r.datos.length === 0);
  r = await llamar('/api/photos');
  verificar('sin ubicación → []', Array.isArray(r.datos) && r.datos.length === 0);
  r = await llamar('/api/photos?all=true');
  verificar('?all=true sin sesión → 403', r.estado === 403, `estado ${r.estado}`);
  await sql`UPDATE fotos SET menores = 'revisar', visibilidad = 'interna', ubicaciones = '{}' WHERE id = 'foto_test_pub1'`;
  await sql`UPDATE fotos SET ubicaciones = ARRAY['test-galeria'] WHERE id = 'foto_test_pub2'`;
  r = await llamar('/api/photos?ubicacion=test-galeria');
  verificar('el público nunca ve fotos con menores', Array.isArray(r.datos) && !r.datos.some((foto) => foto.id === 'foto_test_pub1'));

  console.log('\n— Descartar / restaurar / eliminar (el descarte no borra nada y es por imagen) —');
  await crearFoto('foto_test_desc', { proyectos: ['docencia_innovadora'] });
  await sql`INSERT INTO fotos (id, url, ubicaciones, activo, origen, proyectos) VALUES ('foto_test_desc_copia', 'https://example.com/foto_test_desc.jpg', '{}', true, 'admin', ARRAY['mentoring'])`;
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_desc'], accion: 'descartar', motivo: 'duplicada' } });
  verificar('líder descarta foto de su proyecto (con motivo) → 200', r.estado === 200, JSON.stringify(r.datos));
  const [descartada] = await sql`SELECT descartada, activo, ubicaciones, motivo_descarte, descartada_por FROM fotos WHERE id = 'foto_test_desc'`;
  verificar('  …queda descartada, inactiva, sin ubicaciones, con motivo y autor', descartada.descartada === true && descartada.activo === false && descartada.ubicaciones.length === 0 && descartada.motivo_descarte === 'duplicada' && String(descartada.descartada_por) === veronica.id, JSON.stringify(descartada));
  const [copia] = await sql`SELECT descartada FROM fotos WHERE id = 'foto_test_desc_copia'`;
  verificar('  …el descarte alcanza a TODAS las filas con la misma imagen', copia.descartada === true);
  const [{ funcion }] = await sql`SELECT foto_descartada('https://example.com/foto_test_desc.jpg') AS funcion`;
  verificar('  …foto_descartada(url) = true (la usan informes y noticias)', funcion === true);
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_desc'], accion: 'publicar', ubicaciones: ['docencia-galeria'] } });
  verificar('publicar una descartada → 409', r.estado === 409, `estado ${r.estado}`);
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_desc'], accion: 'descartar', motivo: 'inventado' } });
  verificar('motivo inválido → 400', r.estado === 400, `estado ${r.estado}`);
  r = await llamar('/api/photos/banco?pageSize=60', { cookie: cookieVeronica });
  verificar('listado normal NO incluye descartadas', !(r.datos?.items ?? []).some((foto) => foto.id === 'foto_test_desc'));
  r = await llamar('/api/photos/banco?pageSize=60&estado=descartada', { cookie: cookieVeronica });
  verificar('listado estado=descartada SÍ las incluye', (r.datos?.items ?? []).some((foto) => foto.id === 'foto_test_desc'));
  let errorDescartada = null;
  try { await sql`UPDATE fotos SET descartada = true WHERE id = 'foto_test_pub3'`; } catch (error) { errorDescartada = error; }
  verificar('CHECK: una descartada no puede tener ubicaciones (23514)', errorDescartada?.code === '23514', errorDescartada ? errorDescartada.message : 'no falló');
  r = await llamar('/api/photos/accion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ids: ['foto_test_desc'], accion: 'restaurar' } });
  const [restaurada] = await sql`SELECT descartada, activo, ubicaciones, motivo_descarte FROM fotos WHERE id = 'foto_test_desc'`;
  verificar('restaurar → 200, vuelve a "sin ubicar" y sin marcas de descarte', r.estado === 200 && restaurada.descartada === false && restaurada.activo === true && restaurada.ubicaciones.length === 0 && restaurada.motivo_descarte === null, `${r.estado} ${JSON.stringify(restaurada)}`);
  r = await llamar('/api/photos/foto_test_desc', { cookie: cookieArturo, metodo: 'DELETE' });
  verificar('eliminar una foto NO descartada → 409', r.estado === 409, `estado ${r.estado}`);
  await crearFoto('foto_test_asis', { origen: 'asistencia' });
  await sql`UPDATE fotos SET descartada = true, activo = false WHERE id = 'foto_test_asis'`;
  r = await llamar('/api/photos/foto_test_asis', { cookie: cookieArturo, metodo: 'DELETE' });
  verificar('eliminar foto de asistencia (aunque esté descartada) → 409', r.estado === 409, `estado ${r.estado}`);
  await llamar('/api/photos/accion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ids: ['foto_test_desc'], accion: 'descartar' } });
  r = await llamar('/api/photos/foto_test_desc', { cookie: cookieArturo, metodo: 'DELETE' });
  verificar('eliminar descartada con OTRA fila que usa la misma imagen → 409', r.estado === 409, `estado ${r.estado}`);
  await sql`DELETE FROM fotos WHERE id = 'foto_test_desc_copia'`;
  r = await llamar('/api/photos/foto_test_desc', { cookie: cookieVeronica, metodo: 'DELETE' });
  verificar('líder no puede eliminar (solo admin) → 403', r.estado === 403, `estado ${r.estado}`);
  r = await llamar('/api/photos/foto_test_desc', { cookie: cookieArturo, metodo: 'DELETE' });
  verificar('admin elimina una descartada subida al banco y sin otros usos → 200', r.estado === 200, `estado ${r.estado} ${JSON.stringify(r.datos)}`);

  console.log('\n— Proyectos asignables al registrar (WP5b) —');
  r = await llamar('/api/proyectos?asignables=1');
  verificar('sin sesión → 401', r.estado === 401, `estado ${r.estado}`);
  r = await llamar('/api/proyectos?asignables=1', { cookie: cookieArturo });
  verificar('admin de sitio: ve todos los proyectos activos', r.estado === 200 && r.datos?.proyectos?.length >= 6, JSON.stringify(r.datos));
  r = await llamar('/api/proyectos?asignables=1', { cookie: cookieVeronica });
  const idsAsignablesVeronica = (r.datos?.proyectos ?? []).map((proyecto) => proyecto.id);
  verificar('Verónica: solo sus proyectos (no redlea)', r.estado === 200 && idsAsignablesVeronica.includes('docencia_innovadora') && !idsAsignablesVeronica.includes('redlea'), JSON.stringify(idsAsignablesVeronica));
  r = await llamar('/api/proyectos?asignables=1', { cookie: cookieJhonny });
  const idsAsignablesJhonny = (r.datos?.proyectos ?? []).map((proyecto) => proyecto.id).sort().join(',');
  verificar('Jhonny: internacionalizacion y redlea', idsAsignablesJhonny === 'internacionalizacion,redlea', idsAsignablesJhonny);
  if (cookiePasante) {
    r = await llamar('/api/proyectos?asignables=1', { cookie: cookiePasante });
    verificar('Pasante: regla fija (vinculacion + internacionalizacion)', r.estado === 200 && r.datos?.fijo === true, JSON.stringify(r.datos));
  }
  const cuerpoBase = { titulo: 'foto_test evento', tipo: 'evento_fisico', fecha: '2026-09-01', audiencia_alcanzada: 5, profesores_responsables: [Number(arturo.id)] };
  r = await llamar('/api/difusion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ...cuerpoBase, proyectos: ['redlea'] } });
  verificar('Docente registra evento con proyecto que no es suyo → 403', r.estado === 403, `estado ${r.estado} ${JSON.stringify(r.datos)}`);
  r = await llamar('/api/difusion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ...cuerpoBase } });
  verificar('Docente registra evento sin proyectos → 400', r.estado === 400, `estado ${r.estado}`);
  r = await llamar('/api/enlaces-difusion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { nombre_invitado: 'foto_test', tipo_contenido: 'evento', expira_en: '2099-01-01T00:00:00', proyectos: ['redlea'] } });
  verificar('Generar QR con proyecto ajeno → 401/403 (nunca 2xx)', r.estado >= 400, `estado ${r.estado}`);
}

main()
  .catch((error) => { console.error('ERROR inesperado:', error); fallos++; })
  .finally(async () => {
    await limpiar();
    await sql`DELETE FROM actividades_difusion WHERE titulo = 'foto_test evento'`;
    await sql`DELETE FROM enlaces_difusion WHERE nombre_invitado = 'foto_test'`;
    console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} caso(s) FALLARON`);
    process.exit(fallos === 0 ? 0 : 1);
  });
