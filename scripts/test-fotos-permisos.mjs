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

  console.log('\n— Aprobación por responsable / supervisor de video (Sesión 53) —');
  const [{ id: actividadVideoId }] = await sql`
    INSERT INTO actividades_difusion (titulo, tipo, fecha, registrador_id, audiencia_alcanzada, categoria, profesores_responsables, aprobado_sitio)
    VALUES ('foto_test evento video', 'podcast', '2026-09-01', ${Number(jhonny.id)}, 5, 'vinculacion', ARRAY[${Number(veronica.id)}]::int[], false)
    RETURNING id`;
  await sql`INSERT INTO fotos (id, url, ubicaciones, activo, origen, proyectos, fuente_id) VALUES ('foto_test_video_foto', 'https://example.com/foto_test_video.jpg', '{}', true, 'podcast', ARRAY['docencia_innovadora'], ${String(actividadVideoId)})`;
  await sql`INSERT INTO videos (id, title, category, aprobado_sitio, propuesto_por, profesores_responsables, actividad_difusion_id) VALUES ('video_test_53', 'foto_test video', 'cat_1', false, ${Number(jhonny.id)}, ARRAY[${Number(veronica.id)}]::int[], ${actividadVideoId})`;

  r = await llamar('/api/videos/video_test_53/aprobar', { cookie: cookieJhonny, metodo: 'PATCH', cuerpo: { hay_menores: false, calidad_mala: false } });
  verificar('Jhonny (ni responsable ni supervisor) no puede aprobar el video → 403', r.estado === 403, `estado ${r.estado}`);
  r = await llamar('/api/videos/video_test_53/aprobar', { cookie: cookieVeronica, metodo: 'PATCH', cuerpo: { hay_menores: true, calidad_mala: false } });
  verificar('Verónica (responsable) marca menores → 200, no publica', r.estado === 200 && r.datos?.publicado === false, JSON.stringify(r.datos));
  const [fotoVideoMenores] = await sql`SELECT menores, activo FROM fotos WHERE id = 'foto_test_video_foto'`;
  verificar('  …la foto asociada queda con menores=si e inactiva', fotoVideoMenores.menores === 'si' && fotoVideoMenores.activo === false);
  const [videoSinPublicar] = await sql`SELECT aprobado_sitio FROM videos WHERE id = 'video_test_53'`;
  verificar('  …el video NO quedó publicado', videoSinPublicar.aprobado_sitio === false);
  r = await llamar('/api/videos/video_test_53/aprobar', { cookie: cookieVeronica, metodo: 'PATCH', cuerpo: { hay_menores: false, calidad_mala: false } });
  verificar('Verónica aprueba sin observaciones → 200, publica video + actividad', r.estado === 200 && r.datos?.publicado === true, JSON.stringify(r.datos));
  const [videoPublicado] = await sql`SELECT aprobado_sitio FROM videos WHERE id = 'video_test_53'`;
  const [actividadPublicada] = await sql`SELECT aprobado_sitio FROM actividades_difusion WHERE id = ${actividadVideoId}`;
  verificar('  …video y actividad quedaron aprobados juntos', videoPublicado.aprobado_sitio === true && actividadPublicada.aprobado_sitio === true);

  const [{ id: actividadEventoId }] = await sql`
    INSERT INTO actividades_difusion (titulo, tipo, fecha, registrador_id, audiencia_alcanzada, categoria, profesores_responsables, aprobado_sitio)
    VALUES ('foto_test evento responsable', 'evento_fisico', '2026-09-01', ${Number(veronica.id)}, 5, 'vinculacion', ARRAY[${Number(veronica.id)}]::int[], false)
    RETURNING id`;
  r = await llamar(`/api/actividades-difusion/${actividadEventoId}`, { cookie: cookieJhonny, metodo: 'PATCH', cuerpo: { aprobar: true } });
  verificar('Jhonny (no responsable) no aprueba el evento → 403', r.estado === 403, `estado ${r.estado}`);
  r = await llamar(`/api/actividades-difusion/${actividadEventoId}`, { cookie: cookieVeronica, metodo: 'PATCH', cuerpo: { editar: true, titulo: 'otro' } });
  verificar('Responsable no puede editar (solo aprobar) → 403', r.estado === 403, `estado ${r.estado}`);
  r = await llamar(`/api/actividades-difusion/${actividadEventoId}`, { cookie: cookieVeronica, metodo: 'PATCH', cuerpo: { aprobar: true, hay_menores: false, calidad_mala: false } });
  verificar('Verónica se autoaprueba su propio evento (única responsable) → 200', r.estado === 200, `estado ${r.estado} ${JSON.stringify(r.datos)}`);
  const [eventoAprobado] = await sql`SELECT aprobado_sitio FROM actividades_difusion WHERE id = ${actividadEventoId}`;
  verificar('  …quedó aprobado', eventoAprobado.aprobado_sitio === true);

  console.log('\n— Mis aprobaciones (cola del responsable) —');
  r = await llamar('/api/mis-aprobaciones', { cookie: cookieVeronica });
  const pendientesVeronica = (r.datos?.data ?? []).map((fila) => fila.titulo);
  verificar('Antes de aprobar aparecía en su cola (ya no, quedó aprobado arriba)', r.estado === 200 && !pendientesVeronica.includes('foto_test evento responsable'));

  console.log('\n— Rotación de galerías (Sesión 53) —');
  await sql`INSERT INTO fotos_ubicaciones (slug, nombre, proyecto_id, max_fotos, solo_admin, rotar, orden) VALUES ('test-rotar', 'Rotación de prueba', 'docencia_innovadora', 4, false, true, 998)`;
  for (let numero = 1; numero <= 10; numero++) {
    await sql`INSERT INTO fotos (id, url, ubicaciones, activo, origen, created) VALUES (${'foto_test_rot' + numero}, ${'https://example.com/foto_test_rot' + numero + '.jpg'}, ARRAY['test-rotar'], true, 'admin', now() - (${10 - numero} || ' seconds')::interval)`;
  }
  r = await llamar('/api/photos?ubicacion=test-rotar');
  verificar('rotación: con 10 elegibles y cupo 4, devuelve exactamente 4', Array.isArray(r.datos) && r.datos.length === 4, `devolvió ${Array.isArray(r.datos) ? r.datos.length : r.estado}`);
  const idsPrimeraLlamada = (r.datos ?? []).map((foto) => foto.id).sort().join(',');
  let algunaLlamadaDistinta = false;
  for (let intento = 0; intento < 6; intento++) {
    const otra = await llamar('/api/photos?ubicacion=test-rotar');
    const ids = (otra.datos ?? []).map((foto) => foto.id).sort().join(',');
    if (ids !== idsPrimeraLlamada) { algunaLlamadaDistinta = true; break; }
  }
  verificar('rotación: el conjunto varía entre llamadas (no es un tope fijo)', algunaLlamadaDistinta);
  r = await llamar('/api/photos?ubicacion=test-rotar');
  const idsUltima = (r.datos ?? []).map((foto) => foto.id);
  verificar('rotación: las 2 más recientes SIEMPRE están (foto_test_rot9 y foto_test_rot10, insertadas últimas)', idsUltima.includes('foto_test_rot9') && idsUltima.includes('foto_test_rot10'), JSON.stringify(idsUltima));

  console.log('\n— Cola de propuestas para portada (Sesión 53) —');
  await crearFoto('foto_test_propuesta', { proyectos: ['docencia_innovadora'] });
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_propuesta'], accion: 'proponer', ubicaciones: ['portada'] } });
  verificar('líder propone foto para portada → 200', r.estado === 200, JSON.stringify(r.datos));
  const [propuesta1] = await sql`SELECT propuestas, ubicaciones FROM fotos WHERE id = 'foto_test_propuesta'`;
  verificar('  …queda en "propuestas", NO en "ubicaciones" (no se publica sola)', propuesta1.propuestas.includes('portada') && propuesta1.ubicaciones.length === 0, JSON.stringify(propuesta1));
  r = await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_propuesta'], accion: 'publicar', ubicaciones: ['portada'] } });
  verificar('líder NO puede publicar directo en portada (solo proponer) → 4xx', r.estado === 409 || r.estado === 403, `estado ${r.estado}`);
  r = await llamar('/api/photos/banco?pageSize=60&estado=propuesta', { cookie: cookieArturo });
  verificar('admin ve la propuesta en la cola', (r.datos?.items ?? []).some((foto) => foto.id === 'foto_test_propuesta'));
  await crearFoto('foto_test_propuesta_rechazada', { proyectos: ['docencia_innovadora'] });
  await llamar('/api/photos/accion', { cookie: cookieVeronica, metodo: 'POST', cuerpo: { ids: ['foto_test_propuesta_rechazada'], accion: 'proponer', ubicaciones: ['portada'] } });
  r = await llamar('/api/photos/accion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ids: ['foto_test_propuesta_rechazada'], accion: 'rechazar_propuesta', ubicaciones: ['portada'] } });
  verificar('admin rechaza propuesta → 200', r.estado === 200, JSON.stringify(r.datos));
  const [rechazada] = await sql`SELECT propuestas FROM fotos WHERE id = 'foto_test_propuesta_rechazada'`;
  verificar('  …sale de "propuestas", sigue existiendo la foto', rechazada.propuestas.length === 0);
  r = await llamar('/api/photos/accion', { cookie: cookieArturo, metodo: 'POST', cuerpo: { ids: ['foto_test_propuesta'], accion: 'publicar', ubicaciones: ['portada'] } });
  verificar('admin aprueba la propuesta (publicar) → 200', r.estado === 200, JSON.stringify(r.datos));
  const [aprobada] = await sql`SELECT ubicaciones, propuestas FROM fotos WHERE id = 'foto_test_propuesta'`;
  verificar('  …queda publicada en portada y sale de "propuestas"', aprobada.ubicaciones.includes('portada') && aprobada.propuestas.length === 0, JSON.stringify(aprobada));

}

main()
  .catch((error) => { console.error('ERROR inesperado:', error); fallos++; })
  .finally(async () => {
    await limpiar();
    await sql`DELETE FROM actividades_difusion WHERE titulo = 'foto_test evento'`;
    await sql`DELETE FROM enlaces_difusion WHERE nombre_invitado = 'foto_test'`;
    await sql`DELETE FROM videos WHERE id = 'video_test_53'`;
    await sql`DELETE FROM actividades_difusion WHERE titulo IN ('foto_test evento video', 'foto_test evento responsable')`;
    await sql`DELETE FROM fotos_ubicaciones WHERE slug = 'test-rotar'`;
    console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} caso(s) FALLARON`);
    process.exit(fallos === 0 ? 0 : 1);
  });
