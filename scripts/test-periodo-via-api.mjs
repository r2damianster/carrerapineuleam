import { signSession, ARTURO_SESSION, SITE } from './_lib-sign-session.mjs';

async function run() {
  const cookieValue = await signSession(ARTURO_SESSION);
  const cookieHeader = `pine_app_session=${cookieValue}`;

  // Contribución de prueba, fecha en periodo 2 (agosto)
  const contribRes = await fetch(`${SITE}/api/contribuciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      tipoPublicacion: 'ARTICULO_REGIONAL',
      titulo: '[PRUEBA periodo] Artículo de prueba agosto',
      lineaInvestigacion: 'Educación y Nuevos Escenarios de la Formación Profesional',
      fechaPublicacion: '2026-08-15',
      campoDetallado: 'Prueba',
      estado: 'PUBLICADO',
      authors: [{ authorName: 'Arturo Damián Rodríguez Zambrano', order: 1, isCarreraAuthor: true, esEstudiante: false }],
    }),
  });
  const contribBody = await contribRes.json();
  console.log('POST /api/contribuciones ->', contribRes.status, 'periodoAcademico=', contribBody.periodoAcademico, 'id=', contribBody.id);

  // Difusión de prueba, fecha en periodo 1 (marzo)
  const difusionRes = await fetch(`${SITE}/api/difusion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      titulo: '[PRUEBA periodo] Evento de prueba marzo',
      tipo: 'evento_fisico',
      fecha: '2026-03-10',
      audiencia_alcanzada: 1,
      categoria: 'vinculacion',
      profesores_responsables: [1],
    }),
  });
  const difusionBody = await difusionRes.json();
  console.log('POST /api/difusion ->', difusionRes.status, JSON.stringify(difusionBody));
}

run().catch(e => { console.error(e); process.exit(1); });
