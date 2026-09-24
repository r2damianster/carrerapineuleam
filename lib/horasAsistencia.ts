// Horas acreditables al estudiante-instructor por sesión de asistencia
// aprobada (Sesión 41) — a diferencia de podcast (tabla fija de horas por
// tipo de episodio), acá se calcula la diferencia real entre hora_inicio y
// hora_fin que el instructor ingresa al registrar. Se inserta una fila por
// cada instructor que realmente asistió (asistencia_instructores, Sesión 43
// — titular del espacio o invitado de otro espacio), recién al momento de
// aprobar (mismo patrón que registrarHorasPodcast) — no al registrar la
// asistencia, para no acreditar horas de algo que el profesor todavía no
// revisó.

export function calcularHorasSesion(horaInicio: string, horaFin: string): number {
  const [hIni, mIni] = horaInicio.split(':').map(Number);
  const [hFin, mFin] = horaFin.split(':').map(Number);
  const minutos = (hFin * 60 + mFin) - (hIni * 60 + mIni);
  return Math.round((minutos / 60) * 100) / 100;
}

export async function registrarHorasAsistencia(
  sql: any,
  { asistenciaId, espacioId, horaInicio, horaFin }: { asistenciaId: number; espacioId: number; horaInicio: string; horaFin: string }
) {
  const horas = calcularHorasSesion(horaInicio, horaFin);
  if (horas <= 0) return [] as string[];

  const asistentes = await sql`SELECT usuario_id FROM asistencia_instructores WHERE asistencia_id = ${asistenciaId}`;
  // Fallback para registros creados antes de Sesión 43 (sin filas en
  // asistencia_instructores): acredita a todos los instructores asignados
  // al espacio, comportamiento anterior — evita romper aprobaciones ya en curso.
  const destinatarios = asistentes.length > 0
    ? asistentes
    : await sql`SELECT usuario_id FROM espacio_instructores WHERE espacio_id = ${espacioId}`;

  const advertencias: string[] = [];
  for (const { usuario_id } of destinatarios) {
    // Límite duro de clubes (topes_horas_pasante): se acredita solo lo que cabe en el tope del pasante,
    // sin contar esta misma sesión si ya estaba acreditada.
    const [tope] = await sql`SELECT tope_asistencia::float AS tope FROM topes_horas_pasante WHERE usuario_id = ${usuario_id}`;
    let horasAcreditar = horas;
    if (tope && tope.tope !== null) {
      const [acreditadas] = await sql`
        SELECT COALESCE(SUM(horas), 0)::float AS total FROM horas_asistencia_instructor
        WHERE usuario_id = ${usuario_id} AND asistencia_id <> ${asistenciaId}
      `;
      horasAcreditar = Math.max(0, Math.min(horas, Math.round((tope.tope - acreditadas.total) * 100) / 100));
      if (horasAcreditar < horas) advertencias.push(`Pasante ${usuario_id}: se acreditan ${horasAcreditar} h de ${horas} h (tope de clubes ${tope.tope} h).`);
    }
    if (horasAcreditar <= 0) {
      await sql`DELETE FROM horas_asistencia_instructor WHERE asistencia_id = ${asistenciaId} AND usuario_id = ${usuario_id}`;
      continue;
    }
    await sql`
      INSERT INTO horas_asistencia_instructor (asistencia_id, usuario_id, horas)
      VALUES (${asistenciaId}, ${usuario_id}, ${horasAcreditar})
      ON CONFLICT (asistencia_id, usuario_id) DO UPDATE SET horas = EXCLUDED.horas
    `;
  }
  return advertencias;
}
