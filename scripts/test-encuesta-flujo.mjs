// Prueba el flujo real de la encuesta de impacto contra un servidor local (npm run dev) y la Neon real.
//   node --env-file=.env.local scripts/test-encuesta-flujo.mjs [urlBase]      (por defecto http://localhost:3100)
//
// Crea una encuesta por el panel (como pasante) y otra por enlace público, y las BORRA al terminar
// (aunque falle). Usa un beneficiario/espacio reales con asistencia ya registrada; no toca nada más.

import { neon } from '@neondatabase/serverless';
import { signSession } from './_lib-sign-session.mjs';

const URL_BASE = process.argv[2] ?? 'http://localhost:3100';
const sql = neon(process.env.DATABASE_URL);

let fallos = 0;
function verificar(descripcion, condicion, detalle = '') {
  if (!condicion) fallos++;
  console.log(`${condicion ? 'OK   ' : 'FALLA'} ${descripcion}${condicion ? '' : `  → ${detalle}`}`);
}

async function llamar(ruta, { cookie, metodo = 'GET', cuerpo } = {}) {
  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let datos = null;
  try { datos = await respuesta.json(); } catch { /* sin JSON */ }
  return { estado: respuesta.status, datos };
}

const cookieDe = async (sesion) => `pine_app_session=${await signSession(sesion)}`;
const MARCA = 'test_encuesta_flujo';

async function limpiar(tokens) {
  const encuestas = await sql`SELECT id FROM encuestas_satisfaccion WHERE comentarios LIKE ${MARCA + '%'}`;
  for (const { id } of encuestas) {
    await sql`DELETE FROM encuesta_evaluaciones_instructor WHERE encuesta_id = ${id}`;
    await sql`DELETE FROM encuestas_satisfaccion WHERE id = ${id}`;
  }
  for (const token of tokens) await sql`DELETE FROM enlaces_evaluacion WHERE token = ${token}`;
}

function encuestaCompleta(pasantes, comentario) {
  const evaluaciones = {};
  pasantes.forEach((pasante, indice) => {
    evaluaciones[pasante.id] = indice === 0
      ? { calificacion: 4, no_aplica: false, observacion: 'Que practique más conversación' }
      : { calificacion: null, no_aplica: true, observacion: '' };
  });
  return {
    nivel_satisfaccion: 5, aprendizaje: 4, mejora: 4, recursos: 3,
    impacto_estudios: 4, uso_aprendido: 3, seguridad_hablar: 5, oportunidades: 4,
    recomendaria: 9, comentarios: `${MARCA} ${comentario}`,
    evaluaciones_pasantes: evaluaciones,
  };
}

const tokensCreados = [];
try {
  const [caso] = await sql`
    SELECT ab.beneficiario_id, ae.espacio_id, ai.usuario_id AS pasante_id
    FROM asistencia_beneficiarios ab
    JOIN asistencia_espacio ae ON ae.id = ab.asistencia_id
    JOIN asistencia_instructores ai ON ai.asistencia_id = ae.id
    JOIN espacio_instructores ei ON ei.espacio_id = ae.espacio_id AND ei.usuario_id = ai.usuario_id
    JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
    JOIN inscripciones_espacio ie ON ie.espacio_id = ae.espacio_id AND ie.beneficiario_id = ab.beneficiario_id
    WHERE ae.estado_aprobacion <> 'rechazado' AND e.area = 'vinculacion'
    LIMIT 1`;
  if (!caso) throw new Error('No hay un beneficiario con asistencia registrada para probar');
  const [ciclo] = await sql`SELECT id FROM ciclos_academicos ORDER BY id DESC LIMIT 1`;
  const [pasante] = await sql`SELECT id, email, nombres, rol, modulos_acceso FROM usuarios WHERE id = ${caso.pasante_id}`;
  const [arturo] = await sql`SELECT id, email, nombres, rol, modulos_acceso FROM usuarios WHERE email = 'arturo.rodriguez@uleam.edu.ec'`;
  const sesion = u => ({ id: String(u.id), email: u.email, nombres: u.nombres, rol: u.rol, modulos_acceso: u.modulos_acceso ?? [] });
  const cookiePasante = await cookieDe(sesion(pasante));
  const cookieSupervisor = await cookieDe(sesion(arturo));

  console.log(`Caso: beneficiario ${caso.beneficiario_id}, espacio ${caso.espacio_id}, pasante ${caso.pasante_id}, ciclo ${ciclo.id}\n`);

  // 1. Lista de pasantes a calificar = solo los que coincidieron
  const lista = await llamar(`/api/encuestas/pasantes?espacio_id=${caso.espacio_id}&beneficiario_id=${caso.beneficiario_id}`, { cookie: cookiePasante });
  verificar('GET pasantes devuelve 200 y lista no vacía', lista.estado === 200 && lista.datos?.data?.pasantes?.length > 0, JSON.stringify(lista));
  const pasantes = lista.datos?.data?.pasantes ?? [];
  verificar('Se calcula por coincidencia', lista.datos?.data?.porCoincidencia === true);
  verificar('El pasante del caso está en la lista', pasantes.some(p => p.id === caso.pasante_id));

  const sinSesion = await llamar(`/api/encuestas/pasantes?espacio_id=${caso.espacio_id}&beneficiario_id=${caso.beneficiario_id}`);
  verificar('Sin sesión → 401', sinSesion.estado === 401, String(sinSesion.estado));

  const base = { beneficiario_id: caso.beneficiario_id, espacio_id: caso.espacio_id, ciclo_id: ciclo.id };

  // 2. Validaciones del servidor
  const vacia = await llamar('/api/encuestas', { cookie: cookiePasante, metodo: 'POST', cuerpo: { ...base } });
  verificar('Encuesta vacía → 400 (sin 5 por defecto)', vacia.estado === 400, JSON.stringify(vacia));

  const completa = encuestaCompleta(pasantes, 'panel');
  const ajeno = await llamar('/api/encuestas', {
    cookie: cookiePasante, metodo: 'POST',
    cuerpo: { ...base, ...completa, evaluaciones_pasantes: { ...completa.evaluaciones_pasantes, 999999: { calificacion: 5, no_aplica: false, observacion: '' } } },
  });
  verificar('Calificar a quien no coincidió → 400', ajeno.estado === 400, JSON.stringify(ajeno));

  const sinImpacto = await llamar('/api/encuestas', { cookie: cookiePasante, metodo: 'POST', cuerpo: { ...base, ...completa, recomendaria: null } });
  verificar('Falta NPS → 400', sinImpacto.estado === 400, JSON.stringify(sinImpacto));

  // 3. Envío válido desde la cuenta del pasante
  const ok = await llamar('/api/encuestas', { cookie: cookiePasante, metodo: 'POST', cuerpo: { ...base, ...completa } });
  verificar('Encuesta válida del pasante → 200', ok.estado === 200 && ok.datos?.success, JSON.stringify(ok));

  const [guardada] = await sql`SELECT id, origen, registrado_por, espacio_id, recomendaria, impacto_estudios FROM encuestas_satisfaccion WHERE comentarios = ${MARCA + ' panel'}`;
  verificar('Queda con origen=panel_pasante y registrado_por', guardada?.origen === 'panel_pasante' && guardada?.registrado_por === caso.pasante_id, JSON.stringify(guardada));
  verificar('Guarda espacio, impacto y NPS', guardada?.espacio_id === caso.espacio_id && guardada?.recomendaria === 9 && guardada?.impacto_estudios === 4);
  const evaluaciones = await sql`SELECT instructor_id, calificacion, no_aplica, observacion FROM encuesta_evaluaciones_instructor WHERE encuesta_id = ${guardada.id}`;
  verificar('Guarda una evaluación por cada pasante listado', evaluaciones.length === pasantes.length, JSON.stringify(evaluaciones));
  verificar('Guarda la observación del primero', evaluaciones.some(e => e.observacion === 'Que practique más conversación' && e.calificacion === 4));

  // 4. Aviso al supervisor
  const avisos = await llamar('/api/notificaciones', { cookie: cookieSupervisor });
  verificar('El supervisor recibe el aviso encuestas-llenadas-por-pasante', JSON.stringify(avisos.datos).includes('encuestas-llenadas-por-pasante'), JSON.stringify(avisos.datos).slice(0, 300));

  // 5. Vista del pasante: anónima y con umbral
  const miAvance = await llamar('/api/mi-avance', { cookie: cookiePasante });
  const percepcion = miAvance.datos?.percepcionBeneficiarios;
  verificar('mi-avance trae percepción con umbral', percepcion && percepcion.umbral === 3, JSON.stringify(percepcion));
  verificar('Con menos de 3 respuestas no se muestra promedio ni observaciones', percepcion && percepcion.respuestas < 3 ? (percepcion.visible === false && percepcion.promedio === null && percepcion.observaciones.length === 0) : true, JSON.stringify(percepcion));

  // 6. Vista del supervisor
  const indicadores = await llamar('/api/vinculacion/supervisores/indicadores', { cookie: cookieSupervisor });
  verificar('Indicadores responde con los campos nuevos', indicadores.estado === 200 && 'observacionesPasantes' in indicadores.datos && 'nps' in indicadores.datos.encuestasConsolidado, JSON.stringify(indicadores).slice(0, 300));
  // encuestaCompleta() califica solo al primero de la lista; el resto queda "no aplica" y no cuenta.
  const calificado = pasantes[0];
  const fila = indicadores.datos?.pasantesAnalitica?.find(p => p.pasante_id === calificado.id);
  verificar('Indicadores cuenta la evaluación del pasante calificado', fila && fila.evaluaciones_recibidas >= 1 && fila.evaluaciones_por_panel_pasante >= 1, JSON.stringify(fila));
  const noAplica = pasantes.length > 1 ? indicadores.datos?.pasantesAnalitica?.find(p => p.pasante_id === pasantes[1].id) : null;
  if (noAplica) verificar('Un "no aplica" no cuenta como evaluación', noAplica.evaluaciones_recibidas === 0, JSON.stringify(noAplica));

  // 7. Flujo público por enlace (QR) — el beneficiario lo llena él mismo
  const expira = new Date(Date.now() + 3600_000).toISOString();
  const enlace = await llamar('/api/enlaces', {
    cookie: cookieSupervisor, metodo: 'POST',
    cuerpo: { espacio_id: caso.espacio_id, tipo: 'postest', test_tipo: 'encuesta', beneficiario_id: caso.beneficiario_id, ciclo_id: ciclo.id, expira_en: expira },
  });
  verificar('Se genera el enlace postest/encuesta', enlace.estado === 201, JSON.stringify(enlace));
  const token = enlace.datos?.data?.token;
  if (token) tokensCreados.push(token);

  const info = await llamar(`/api/enlaces/${token}`);
  verificar('GET público devuelve pasantes por coincidencia', info.estado === 200 && info.datos?.data?.pasantes?.length === pasantes.length && info.datos?.data?.porCoincidencia === true, JSON.stringify(info));

  const publicaInvalida = await llamar(`/api/enlaces/${token}/postest`, { metodo: 'POST', cuerpo: { nivel_satisfaccion: 5 } });
  verificar('POST público incompleto → 400', publicaInvalida.estado === 400, JSON.stringify(publicaInvalida));

  const publica = await llamar(`/api/enlaces/${token}/postest`, { metodo: 'POST', cuerpo: encuestaCompleta(info.datos.data.pasantes, 'qr') });
  verificar('POST público válido → 200', publica.estado === 200 && publica.datos?.success, JSON.stringify(publica));
  const [porQr] = await sql`SELECT origen, registrado_por, espacio_id FROM encuestas_satisfaccion WHERE comentarios = ${MARCA + ' qr'}`;
  verificar('Queda con origen=qr_beneficiario y sin registrado_por', porQr?.origen === 'qr_beneficiario' && porQr?.registrado_por === null && porQr?.espacio_id === caso.espacio_id, JSON.stringify(porQr));

  const reuso = await llamar(`/api/enlaces/${token}/postest`, { metodo: 'POST', cuerpo: encuestaCompleta(info.datos.data.pasantes, 'qr2') });
  verificar('El enlace de un solo uso ya no sirve → 410', reuso.estado === 410, String(reuso.estado));
} catch (error) {
  fallos++;
  console.error('ERROR en la prueba:', error);
} finally {
  await limpiar(tokensCreados);
  const [{ restantes }] = await sql`SELECT COUNT(*)::int AS restantes FROM encuestas_satisfaccion WHERE comentarios LIKE ${MARCA + '%'}`;
  console.log(`\nLimpieza: ${restantes === 0 ? 'sin filas de prueba restantes' : `QUEDAN ${restantes} FILAS`}`);
}
console.log(fallos === 0 ? 'Todo en verde' : `${fallos} caso(s) fallaron`);
process.exit(fallos === 0 ? 0 : 1);
