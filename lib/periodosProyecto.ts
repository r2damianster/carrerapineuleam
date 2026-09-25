// Periodos fijos del proyecto de Vinculación (independientes de ciclos_academicos):
//   Periodo 1: abril a agosto · Periodo 2: septiembre a diciembre, de cada año.

export interface PeriodoProyecto {
  numero: 1 | 2;
  anio: number;
  mesInicio: number; // 1-12
  mesFin: number;
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  etiqueta: string; // ej. "2026-2"
}

const MESES_PERIODO: Record<1 | 2, { inicio: number; fin: number }> = {
  1: { inicio: 4, fin: 8 },
  2: { inicio: 9, fin: 12 },
};

export function construirPeriodo(anio: number, numero: 1 | 2): PeriodoProyecto {
  const { inicio, fin } = MESES_PERIODO[numero];
  const ultimoDia = new Date(anio, fin, 0).getDate();
  const dosDigitos = (valor: number) => String(valor).padStart(2, '0');
  return {
    numero,
    anio,
    mesInicio: inicio,
    mesFin: fin,
    desde: `${anio}-${dosDigitos(inicio)}-01`,
    hasta: `${anio}-${dosDigitos(fin)}-${dosDigitos(ultimoDia)}`,
    etiqueta: `${anio}-${numero}`,
  };
}

/** "2026-2" (nombre de ciclo_academico) -> periodo del proyecto. */
export function periodoDeCiclo(nombreCiclo: string): PeriodoProyecto | null {
  const coincidencia = /^(\d{4})-([12])$/.exec((nombreCiclo || '').trim());
  if (!coincidencia) return null;
  return construirPeriodo(Number(coincidencia[1]), Number(coincidencia[2]) as 1 | 2);
}

/** "YYYY-MM" -> periodo que lo contiene (enero a marzo no pertenecen a ninguno). */
export function periodoDeMes(mes: string): PeriodoProyecto | null {
  const coincidencia = /^(\d{4})-(\d{2})/.exec(mes || '');
  if (!coincidencia) return null;
  const anio = Number(coincidencia[1]);
  const numeroMes = Number(coincidencia[2]);
  if (numeroMes >= MESES_PERIODO[1].inicio && numeroMes <= MESES_PERIODO[1].fin) return construirPeriodo(anio, 1);
  if (numeroMes >= MESES_PERIODO[2].inicio && numeroMes <= MESES_PERIODO[2].fin) return construirPeriodo(anio, 2);
  return null;
}
