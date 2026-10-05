// scripts/test-investigacion-aportantes.mjs — Sesión 63
// Recorrido end-to-end, contra un servidor local (next dev -p 3100) y la Neon real, del subsistema de
// aportantes de Investigación: alta por el líder → colaborador → aporte → evento → validación → metas →
// informe → notificación → aislamiento de Vinculación.
//
//   node --env-file=.env.local scripts/test-investigacion-aportantes.mjs [urlBase]
//
// Crea personas y filas de prueba (prefijo test_inv_) en el proyecto 'mentoring' y las borra al terminar,
// aunque falle. No toca ninguna persona ni dato real.

import { neon } from '@neondatabase/serverless';
import { signSession } from './_lib-sign-session.mjs';

const URL_BASE = process.argv[2] ?? 'http://localhost:3100';
const PROYECTO = 'mentoring';
const sql = neon(process.env.DATABASE_URL);
const sufijo = Date.now();

let fallos = 0;
function verificar(descripcion, condicion, detalle = '') {
  if (!condicion) fallos++;
  console.log(`${condicion ? 'OK   ' : 'FALLA'} ${descripcion}${condicion ? '' : `  → ${detalle}`}`);
}

async function cookieDe(persona) {
  return `pine_app_session=${await signSession({
    id: String(persona.id), email: persona.email, nombres: persona.nombres, rol: persona.rol, modulos_acceso: persona.modulos_acceso ?? [],
  })}`;
}

async function llamar(ruta, { cookie, metodo = 'GET', cuerpo, seguirRedireccion = true } = {}) {
  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    method: metodo,
    redirect: seguirRedireccion ? 'follow' : 'manual',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let datos = null;
  try { datos = await respuesta.json(); } catch { /* sin cuerpo JSON */ }
  return { estado: respuesta.status, datos, ubicacion: respuesta.headers.get('location') };
}

const idsUsuariosPrueba = [];
let objetivoPruebaId = null;

async function crearUsuario({ nombres, rol, modulos = [] }) {
  const correo = `test_inv_${nombres.toLowerCase()}_${sufijo}@example.org`;
  const [fila] = await sql`
    INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, activado, modulos_acceso)
    VALUES (${nombres}, 'TestInv', ${correo}, 'x', ${rol}, true, ${modulos}) RETURNING id, email, nombres, rol, modulos_acceso`;
  idsUsuariosPrueba.push(Number(fila.id));
  return fila;
}

async function limpiar() {
  const ids = idsUsuariosPrueba;
  if (ids.length > 0) {
    await sql`DELETE FROM investigacion_aportes WHERE usuario_id = ANY(${ids}::int[])`;
    await sql`DELETE FROM videos WHERE propuesto_por = ANY(${ids}::int[])`;
    await sql`DELETE FROM actividades_difusion WHERE registrador_id = ANY(${ids}::int[])`;
    await sql`DELETE FROM fotos WHERE subido_por_id = ANY(${ids}::int[])`;
    await sql`DELETE FROM investigacion_aportantes WHERE usuario_id = ANY(${ids}::int[])`;
    await sql`DELETE FROM members WHERE usuario_id = ANY(${ids}::int[])`;
    await sql`DELETE FROM proyecto_miembros WHERE usuario_id = ANY(${ids}::int[])`;
  }
  if (objetivoPruebaId) {
    await sql`DELETE FROM proyecto_actividades_plan WHERE objetivo_id = ${objetivoPruebaId}`;
    await sql`DELETE FROM proyecto_objetivos WHERE id = ${objetivoPruebaId}`;
  }
  // Colaborador creado por el alta (no está en la lista de ids): se busca por su correo de prueba.
  await sql`DELETE FROM investigacion_aportes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE ${'test_inv_%' + sufijo + '%'})`;
  await sql`DELETE FROM investigacion_aportantes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE ${'test_inv_%' + sufijo + '%'})`;
  await sql`DELETE FROM members WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE ${'test_inv_%' + sufijo + '%'})`;
  await sql`DELETE FROM proyecto_miembros WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE ${'test_inv_%' + sufijo + '%'})`;
  await sql`DELETE FROM fotos WHERE subido_por_id IN (SELECT id FROM usuarios WHERE email LIKE ${'test_inv_%' + sufijo + '%'})`;
  await sql`DELETE FROM actividades_difusion WHERE registrador_id IN (SELECT id FROM usuarios WHERE email LIKE ${'test_inv_%' + sufijo + '%'})`;
  await sql`DELETE FROM videos WHERE propuesto_por IN (SELECT id FROM usuarios WHERE email LIKE ${'test_inv_%' + sufijo + '%'})`;
  await sql`DELETE FROM usuarios WHERE email LIKE ${'test_inv_%' + sufijo + '%'}`;
}

async function main() {
  const hoy = new Date().toISOString().slice(0, 10);

  // ── Personas de prueba ──────────────────────────────────────────────────────
  const lider = await crearUsuario({ nombres: 'Lider', rol: 'profesor', modulos: ['investigacion'] });
  const docenteAjeno = await crearUsuario({ nombres: 'Ajeno', rol: 'profesor' });
  const pasante = await crearUsuario({ nombres: 'Pasante', rol: 'estudiante' });
  await sql`INSERT INTO proyecto_miembros (proyecto_id, usuario_id, rol_en_proyecto, activo) VALUES (${PROYECTO}, ${lider.id}, 'lider', true)`;
  const cookieLider = await cookieDe(lider);
  const cookieAjeno = await cookieDe(docenteAjeno);
  const cookiePasante = await cookieDe(pasante);

  // Meta del plan para probar el avance (objetivo + actividad temporales)
  const [objetivo] = await sql`INSERT INTO proyecto_objetivos (proyecto_id, tipo, texto, orden) VALUES (${PROYECTO}, 'especifico', 'Objetivo de prueba test_inv', 99) RETURNING id`;
  objetivoPruebaId = objetivo.id;
  const [ciclo] = await sql`SELECT id FROM ciclos_academicos WHERE CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin LIMIT 1`;
  const [actividadPlan] = await sql`
    INSERT INTO proyecto_actividades_plan (objetivo_id, actividad, ciclo_id, activo, meta_cantidad, unidad, fuente)
    VALUES (${objetivo.id}, 'Eventos de prueba test_inv', ${ciclo.id}, true, 2, 'eventos', 'manual') RETURNING id`;

  // ── 1. Alta por el líder ────────────────────────────────────────────────────
  console.log('\n— Alta de aportantes por el líder —');
  const correoColaborador = `test_inv_colab_${sufijo}@example.org`;
  let r = await llamar(`/api/investigacion/proyectos/${PROYECTO}/equipo`, { cookie: cookieAjeno });
  verificar('un docente que no lidera el proyecto no ve el equipo (403)', r.estado === 403, `estado ${r.estado}`);

  r = await llamar(`/api/investigacion/proyectos/${PROYECTO}/equipo`, { cookie: cookieLider, metodo: 'POST', cuerpo: { email: correoColaborador } });
  verificar('persona sin cuenta y sin nombres → 400 pidiendo nombres', r.estado === 400, `estado ${r.estado}`);

  r = await llamar(`/api/investigacion/proyectos/${PROYECTO}/equipo`, {
    cookie: cookieLider, metodo: 'POST',
    cuerpo: { email: correoColaborador, nombres: 'Colab', apellidos: 'TestInv', tipo: 'estudiante_apoyo', visible_en_web: true },
  });
  verificar('el líder agrega a un externo por correo → 201', r.estado === 201, `estado ${r.estado} ${JSON.stringify(r.datos)}`);
  const [colaborador] = await sql`SELECT id, email, nombres, rol, activado, modulos_acceso FROM usuarios WHERE email = ${correoColaborador}`;
  verificar('se creó la cuenta con rol colaborador y sin activar', colaborador?.rol === 'colaborador' && colaborador.activado === false);
  const [filaAportante] = await sql`SELECT tipo, activo, visible_en_web FROM investigacion_aportantes WHERE usuario_id = ${colaborador.id} AND proyecto_id = ${PROYECTO}`;
  verificar('quedó como estudiante_apoyo, activo y visible_en_web', filaAportante?.tipo === 'estudiante_apoyo' && filaAportante.activo && filaAportante.visible_en_web);
  const [tarjeta] = await sql`SELECT activo, email FROM members WHERE usuario_id = ${colaborador.id}`;
  verificar('tarjeta web creada PENDIENTE (activo=false) y sin correo público', tarjeta && tarjeta.activo === false && tarjeta.email === '');
  const [equipoWeb] = await sql`SELECT rol_en_proyecto, activo FROM proyecto_miembros WHERE usuario_id = ${colaborador.id} AND proyecto_id = ${PROYECTO}`;
  verificar('figura como participante del proyecto', equipoWeb?.rol_en_proyecto === 'participante' && equipoWeb.activo === true);

  r = await llamar(`/api/investigacion/proyectos/${PROYECTO}/equipo`, { cookie: cookieLider, metodo: 'POST', cuerpo: { email: pasante.email } });
  verificar('un pasante de Vinculación NO puede ser aportante (400)', r.estado === 400, `estado ${r.estado}`);

  const cookieColaborador = await cookieDe(colaborador);

  // ── 2. El colaborador y sus aportes ─────────────────────────────────────────
  console.log('\n— El colaborador registra aportes —');
  r = await llamar('/api/investigacion/mis-aportes', { cookie: cookieColaborador });
  verificar('ve el proyecto donde es aportante y la meta del plan', r.estado === 200 && r.datos.proyectos.some((p) => p.id === PROYECTO) && r.datos.actividadesPlan.some((a) => a.id === actividadPlan.id), `estado ${r.estado}`);

  r = await llamar('/api/investigacion/mis-aportes', {
    cookie: cookieColaborador, metodo: 'POST',
    cuerpo: { proyecto_id: PROYECTO, actividad_plan_id: actividadPlan.id, fecha: hoy, tipo: 'actividad', descripcion: 'Aporte 1 de prueba', horas: 2 },
  });
  verificar('registra un aporte ligado a la meta → 201', r.estado === 201, `estado ${r.estado} ${JSON.stringify(r.datos)}`);

  r = await llamar('/api/investigacion/mis-aportes', {
    cookie: cookieColaborador, metodo: 'POST',
    cuerpo: { proyecto_id: 'redlea', fecha: hoy, tipo: 'actividad', descripcion: 'En otro proyecto' },
  });
  verificar('NO puede aportar a un proyecto donde no es aportante (403)', r.estado === 403, `estado ${r.estado}`);

  r = await llamar('/api/investigacion/mis-aportes', {
    cookie: cookiePasante, metodo: 'POST',
    cuerpo: { proyecto_id: PROYECTO, fecha: hoy, tipo: 'actividad', descripcion: 'Soy pasante' },
  });
  verificar('un pasante no puede registrar aportes de Investigación (403)', r.estado === 403, `estado ${r.estado}`);

  // ── 3. Evento y podcast ─────────────────────────────────────────────────────
  console.log('\n— Eventos y podcasts —');
  const cuerpoEvento = {
    proyecto_id: PROYECTO, actividad_plan_id: actividadPlan.id, titulo: 'Evento de prueba test_inv', tipo: 'evento_fisico', fecha: hoy,
    audiencia_alcanzada: 12, descripcion: 'Descripción de prueba', evidencia_url: 'https://res.cloudinary.com/demo/image/upload/test_inv.jpg', hay_menores: false,
  };
  r = await llamar('/api/investigacion/difusion', { cookie: cookieColaborador, metodo: 'POST', cuerpo: cuerpoEvento });
  verificar('el colaborador registra un evento → 201', r.estado === 201, `estado ${r.estado} ${JSON.stringify(r.datos)}`);
  const [actividad] = await sql`SELECT id, aprobado_sitio, categoria, proyectos, profesores_responsables FROM actividades_difusion WHERE registrador_id = ${colaborador.id}`;
  verificar('la actividad nace SIN aprobar y apunta solo a su proyecto', actividad && actividad.aprobado_sitio === false && actividad.categoria === 'investigacion' && actividad.proyectos.length === 1 && actividad.proyectos[0] === PROYECTO);
  verificar('el líder del proyecto es su profesor responsable', actividad?.profesores_responsables.map(Number).includes(Number(lider.id)));
  const [aporteEvento] = await sql`SELECT estado_validacion, tipo FROM investigacion_aportes WHERE actividad_difusion_id = ${actividad.id}`;
  verificar('se creó el aporte ligado al evento, por validar', aporteEvento?.estado_validacion === 'pendiente' && aporteEvento.tipo === 'evento');
  const [fotoBanco] = await sql`SELECT menores, origen FROM fotos WHERE fuente_id = ${String(actividad.id)} AND origen = 'evento' AND subido_por_id = ${colaborador.id}`;
  verificar('su foto entró al banco como menores "revisar" (externo)', fotoBanco?.menores === 'revisar', JSON.stringify(fotoBanco));

  r = await llamar('/api/investigacion/difusion', { cookie: cookieColaborador, metodo: 'POST', cuerpo: { ...cuerpoEvento, titulo: 'Otro', tipo: 'podcast' } });
  verificar('un podcast sin video → 400', r.estado === 400, `estado ${r.estado}`);

  r = await llamar('/api/investigacion/difusion', { cookie: cookieColaborador, metodo: 'POST', cuerpo: { ...cuerpoEvento, proyecto_id: 'redlea', titulo: 'Fuera de proyecto' } });
  verificar('evento en un proyecto ajeno → 403', r.estado === 403, `estado ${r.estado}`);

  // ── 4. Aislamiento de Vinculación ───────────────────────────────────────────
  console.log('\n— El colaborador no entra a Vinculación —');
  for (const [ruta, metodo] of [['/api/espacios', 'GET'], ['/api/beneficiarios', 'GET'], ['/api/difusion', 'POST'], ['/api/espacios/asistencia', 'POST']]) {
    r = await llamar(ruta, { cookie: cookieColaborador, metodo, cuerpo: metodo === 'POST' ? {} : undefined });
    verificar(`${metodo} ${ruta} bloqueado para colaborador`, r.estado === 401 || r.estado === 403, `estado ${r.estado}`);
  }
  for (const ruta of ['/vinculacion/asistencia', '/investigacion/informes', '/gestion-carrera', '/contribuciones/new']) {
    r = await llamar(ruta, { cookie: cookieColaborador, seguirRedireccion: false });
    verificar(`página ${ruta} redirige al dashboard`, r.estado >= 300 && r.estado < 400 && (r.ubicacion ?? '').includes('/portal/dashboard'), `estado ${r.estado} → ${r.ubicacion}`);
  }
  r = await llamar('/investigacion/mis-aportes', { cookie: cookieColaborador, seguirRedireccion: false });
  verificar('página /investigacion/mis-aportes SÍ carga para el colaborador', r.estado === 200, `estado ${r.estado}`);
  r = await llamar('/investigacion/mis-aportes', { cookie: cookiePasante, seguirRedireccion: false });
  verificar('un pasante es redirigido fuera de /investigacion/mis-aportes', r.estado >= 300 && r.estado < 400, `estado ${r.estado}`);

  // ── 5. Validación por el líder ──────────────────────────────────────────────
  console.log('\n— El líder valida —');
  r = await llamar(`/api/investigacion/proyectos/${PROYECTO}/equipo`, { cookie: cookieLider });
  const pendientes = r.datos?.aportes?.filter((a) => a.estado_validacion === 'pendiente') ?? [];
  verificar('el líder ve 2 aportes por validar (el suelto y el del evento)', pendientes.length === 2, `hay ${pendientes.length}`);

  r = await llamar('/api/notificaciones', { cookie: cookieLider });
  const aviso = r.datos?.data?.find((n) => n.id === 'aportes-investigacion-por-validar');
  verificar('el líder recibe el aviso de aportes por validar', aviso && aviso.cantidad === 2 && aviso.href.includes(PROYECTO), JSON.stringify(aviso));

  const [aporteSuelto] = pendientes.filter((a) => !a.descripcion.startsWith('Evento de prueba'));
  r = await llamar(`/api/investigacion/aportes/${aporteSuelto.id}`, { cookie: cookieAjeno, metodo: 'PATCH', cuerpo: { accion: 'validar' } });
  verificar('un docente ajeno al proyecto no puede validar (403)', r.estado === 403, `estado ${r.estado}`);
  r = await llamar(`/api/investigacion/aportes/${aporteSuelto.id}`, { cookie: cookieLider, metodo: 'PATCH', cuerpo: { accion: 'rechazar' } });
  verificar('rechazar sin motivo → 400', r.estado === 400, `estado ${r.estado}`);
  r = await llamar(`/api/investigacion/aportes/${aporteSuelto.id}`, { cookie: cookieColaborador, metodo: 'PATCH', cuerpo: { accion: 'validar' } });
  verificar('el propio colaborador no puede validar su aporte (403)', r.estado === 403, `estado ${r.estado}`);

  r = await llamar(`/api/investigacion/proyectos/${PROYECTO}/avance`, { cookie: cookieLider });
  let avanceMeta = r.datos?.avance?.actividades?.find((a) => a.id === actividadPlan.id);
  verificar('antes de validar, la meta tiene avance 0 y 2 por validar', avanceMeta?.avance === 0 && avanceMeta.pendiente === 2, JSON.stringify(avanceMeta));

  r = await llamar(`/api/investigacion/aportes/${aporteSuelto.id}`, { cookie: cookieLider, metodo: 'PATCH', cuerpo: { accion: 'validar' } });
  verificar('el líder valida el aporte suelto → 200', r.estado === 200, `estado ${r.estado}`);
  const [idAporteEvento] = pendientes.filter((a) => a.id !== aporteSuelto.id);
  r = await llamar(`/api/investigacion/aportes/${idAporteEvento.id}`, { cookie: cookieLider, metodo: 'PATCH', cuerpo: { accion: 'validar' } });
  verificar('el líder valida el aporte del evento → 200', r.estado === 200, `estado ${r.estado}`);

  r = await llamar(`/api/investigacion/proyectos/${PROYECTO}/avance`, { cookie: cookieLider });
  avanceMeta = r.datos?.avance?.actividades?.find((a) => a.id === actividadPlan.id);
  verificar('tras validar, la meta marca 2/2 eventos = 100%', avanceMeta?.avance === 2 && avanceMeta.meta === 2 && avanceMeta.porcentaje === 100, JSON.stringify(avanceMeta));
  verificar('docentes/estudiantes de apoyo cuentan (1 estudiante de apoyo)', r.datos?.avance?.personas?.estudiantes?.actual >= 1);

  r = await llamar('/api/investigacion/avance', { cookie: cookieLider });
  verificar('el resumen del Dashboard PINE incluye el proyecto', r.estado === 200 && r.datos.proyectos.some((p) => p.id === PROYECTO), `estado ${r.estado}`);
  r = await llamar('/api/investigacion/avance', { cookie: cookieColaborador });
  verificar('el resumen del Dashboard PINE no es para colaboradores', r.estado === 401, `estado ${r.estado}`);

  // ── 6. Publicación del evento ───────────────────────────────────────────────
  console.log('\n— Publicación del evento —');
  r = await llamar(`/api/actividades-difusion/${actividad.id}`, { cookie: cookieLider, metodo: 'PATCH', cuerpo: { aprobar: true, hay_menores: false, calidad_mala: false } });
  verificar('el líder (responsable) aprueba la actividad para el sitio', r.estado === 200, `estado ${r.estado} ${JSON.stringify(r.datos)}`);
  r = await llamar(`/api/actividades-difusion/${actividad.id}`, { cookie: cookieAjeno, metodo: 'PATCH', cuerpo: { aprobar: true } });
  verificar('un docente ajeno no puede aprobarla (403)', r.estado === 403, `estado ${r.estado}`);

  // ── 7. Informe mensual de Investigación ─────────────────────────────────────
  console.log('\n— Informe mensual de Investigación —');
  r = await llamar(`/investigacion/informes/api/datos?desde=${hoy}&hasta=${hoy}`, { cookie: cookieLider });
  const tipos = (r.datos?.actividades ?? []).map((a) => a.tipo);
  verificar('el informe lista el aporte validado suelto', tipos.includes('aporte_investigacion'), JSON.stringify(tipos));
  verificar('el informe lista el avance de metas del proyecto', (r.datos?.actividades ?? []).some((a) => a.tipo === 'avance_metas' && a.descripcion.includes('Eventos de prueba test_inv: 2/2')), JSON.stringify(r.datos?.actividades?.filter((a) => a.tipo === 'avance_metas')));
  verificar('el aporte ligado a un evento propio no se cuenta dos veces', tipos.filter((tipo) => tipo === 'aporte_investigacion').length === 1, `hay ${tipos.filter((tipo) => tipo === 'aporte_investigacion').length}`);

  // ── 8. Quitar al aportante ──────────────────────────────────────────────────
  console.log('\n— Quitar del proyecto —');
  r = await llamar(`/api/investigacion/proyectos/${PROYECTO}/equipo`, { cookie: cookieLider, metodo: 'PATCH', cuerpo: { usuario_id: colaborador.id, accion: 'quitar' } });
  verificar('el líder quita al colaborador → 200', r.estado === 200, `estado ${r.estado}`);
  const [filaQuitada] = await sql`SELECT activo, visible_en_web FROM investigacion_aportantes WHERE usuario_id = ${colaborador.id}`;
  const [equipoQuitado] = await sql`SELECT activo FROM proyecto_miembros WHERE usuario_id = ${colaborador.id} AND proyecto_id = ${PROYECTO}`;
  verificar('queda inactivo, sin "mostrar en la web" y fuera del equipo público', filaQuitada.activo === false && filaQuitada.visible_en_web === false && equipoQuitado.activo === false);
  const [historial] = await sql`SELECT COUNT(*)::int AS total FROM investigacion_aportes WHERE usuario_id = ${colaborador.id}`;
  verificar('su historial de aportes se conserva', historial.total === 2, `hay ${historial.total}`);
  r = await llamar('/api/investigacion/mis-aportes', { cookie: cookieColaborador, metodo: 'POST', cuerpo: { proyecto_id: PROYECTO, fecha: hoy, tipo: 'actividad', descripcion: 'Ya fuera' } });
  verificar('ya no puede registrar aportes (403)', r.estado === 403, `estado ${r.estado}`);

  // ── 9. Los pasantes de Vinculación siguen igual ─────────────────────────────
  console.log('\n— Vinculación intacta —');
  const [topes] = await sql`SELECT COUNT(*)::int AS total FROM actividades_investigacion_pasante`;
  verificar('la tabla de actividades de investigación de pasantes sigue accesible', typeof topes.total === 'number');
  r = await llamar('/api/actividades-investigacion', { cookie: cookiePasante });
  verificar('el pasante sigue pudiendo consultar su reporte de investigación (no 401/403/500)', ![401, 403, 500].includes(r.estado), `estado ${r.estado}`);
}

try {
  await main();
} catch (error) {
  fallos++;
  console.error('ERROR en el recorrido:', error);
} finally {
  await limpiar();
  console.log(`\nLimpieza hecha. ${fallos === 0 ? 'TODO OK' : `${fallos} verificación(es) fallaron`}.`);
  process.exit(fallos === 0 ? 0 : 1);
}
