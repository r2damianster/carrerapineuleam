export function calcularPeriodoAcademico(fecha: Date): string {
  const mes = fecha.getUTCMonth() + 1;
  return `${fecha.getUTCFullYear()}-${mes <= 6 ? 1 : 2}`;
}
