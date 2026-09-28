/**
 * Tope preventivo de pasantes invitados por sesión de asistencia.
 *
 * No es una reacción a un caso de abuso puntual — es un techo estructural para que el número
 * de personas de apoyo nunca crezca sin relación al número de beneficiarios presentes ese día,
 * sin importar si el hueco lo cubren invitados o titulares.
 *
 * Deliberadamente NO se expone este número al pasante ni al supervisor en la UI (ver
 * app/vinculacion/asistencia/page.tsx y app/vinculacion/supervisar/page.tsx) — el mensaje de
 * rechazo tampoco lo revela, para no convertir la fórmula en un objetivo a alcanzar.
 */
export function calcularTopeInvitados(beneficiariosPresentes: number, titularesPresentes: number): number {
  if (beneficiariosPresentes <= 0) return 0;
  const tope = Math.max(0, Math.ceil(beneficiariosPresentes / 2) - titularesPresentes);
  // Piso de seguridad: si ningún titular asignado está presente, siempre se permite al menos
  // 1 persona de apoyo (alguien debe poder supervisar).
  if (titularesPresentes === 0) return Math.max(tope, 1);
  return tope;
}
