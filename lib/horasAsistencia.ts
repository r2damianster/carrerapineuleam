// Horas acreditables al estudiante-instructor por sesión de asistencia
// aprobada (Sesión 41) — a diferencia de podcast (tabla fija de horas por
// tipo de episodio), acá se calcula la diferencia real entre hora_inicio y
// hora_fin que el instructor ingresa al registrar. Se inserta una fila por
// cada instructor actualmente asignado al espacio (espacio_instructores),
// recién al momento de aprobar (mismo patrón que registrarHorasPodcast) —
// no al registrar la asistencia, para no acreditar horas de algo que el
// profesor todavía no revisó.

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
  if (horas <= 0) return;

  const instructores = await sql`SELECT usuario_id FROM espacio_instructores WHERE espacio_id = ${espacioId}`;
  for (const { usuario_id } of instructores) {
    await sql`
      INSERT INTO horas_asistencia_instructor (asistencia_id, usuario_id, horas)
      VALUES (${asistenciaId}, ${usuario_id}, ${horas})
      ON CONFLICT (asistencia_id, usuario_id) DO UPDATE SET horas = EXCLUDED.horas
    `;
  }
}
