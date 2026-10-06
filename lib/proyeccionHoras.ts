// Proyección de cumplimiento de horas por pasante (solo líder de Vinculación / superadmin).
// Modelo lineal: ritmo = horas aprobadas dentro del ciclo ÷ días transcurridos del ciclo.
// Se proyecta ese ritmo hasta el fin del ciclo y se suma a lo ya acumulado (todo el historial, con topes aplicados).

export type EstadoProyeccion = 'completo' | 'cumple' | 'en_riesgo' | 'no_cumple';

export interface EntradaProyeccion {
  inicioCiclo: string; // YYYY-MM-DD
  finCiclo: string; // YYYY-MM-DD
  hoy: Date;
  horasAcumuladas: number; // total contable (con topes y meta aplicados)
  horasEnCiclo: number; // aprobadas con fecha dentro del ciclo
  meta: number;
}

export interface ResultadoProyeccion {
  diasTranscurridos: number;
  diasRestantes: number;
  horasPorSemana: number; // ritmo actual
  proyeccionFinal: number; // horas al cierre del ciclo si mantiene el ritmo (tope = meta)
  horasFaltantes: number;
  horasPorSemanaRequeridas: number | null; // ritmo necesario para llegar; null si ya completó o el ciclo terminó
  estado: EstadoProyeccion;
  confianzaBaja: boolean; // pocos días de datos: la tendencia es poco confiable
}

export const UMBRAL_EN_RIESGO = 0.85;
export const DIAS_MINIMOS_CONFIABLES = 21;
const MS_POR_DIA = 86_400_000;

const aFecha = (texto: string) => new Date(`${texto.slice(0, 10)}T00:00:00`);
const redondear = (valor: number) => Math.round(valor * 10) / 10;

export function proyectarPasante(entrada: EntradaProyeccion): ResultadoProyeccion {
  const inicio = aFecha(entrada.inicioCiclo);
  const fin = aFecha(entrada.finCiclo);
  const hoy = new Date(entrada.hoy.getFullYear(), entrada.hoy.getMonth(), entrada.hoy.getDate());

  const diasTotales = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / MS_POR_DIA));
  const diasTranscurridos = Math.min(diasTotales, Math.max(1, Math.round((hoy.getTime() - inicio.getTime()) / MS_POR_DIA)));
  const diasRestantes = Math.max(0, Math.round((fin.getTime() - hoy.getTime()) / MS_POR_DIA));

  const horasPorDia = entrada.horasEnCiclo / diasTranscurridos;
  const proyeccionFinal = Math.min(entrada.meta, entrada.horasAcumuladas + horasPorDia * diasRestantes);
  const horasFaltantes = Math.max(0, entrada.meta - entrada.horasAcumuladas);

  let estado: EstadoProyeccion;
  if (horasFaltantes === 0) estado = 'completo';
  else if (proyeccionFinal >= entrada.meta) estado = 'cumple';
  else if (proyeccionFinal >= entrada.meta * UMBRAL_EN_RIESGO) estado = 'en_riesgo';
  else estado = 'no_cumple';

  const semanasRestantes = diasRestantes / 7;
  return {
    diasTranscurridos,
    diasRestantes,
    horasPorSemana: redondear(horasPorDia * 7),
    proyeccionFinal: redondear(proyeccionFinal),
    horasFaltantes: redondear(horasFaltantes),
    horasPorSemanaRequeridas: horasFaltantes === 0 || semanasRestantes === 0 ? null : redondear(horasFaltantes / semanasRestantes),
    estado,
    confianzaBaja: diasTranscurridos < DIAS_MINIMOS_CONFIABLES,
  };
}
