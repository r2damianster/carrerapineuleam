/**
 * Generador de gráficos PNG para informes de Vinculación (Supervisor y Líder)
 * Utiliza QuickChart API con fallback seguro en caso de error de red.
 */

async function solicitarGraficoQuickChart(chartConfig: object, width = 800, height = 400): Promise<Buffer | null> {
  try {
    const res = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        width,
        height,
        devicePixelRatio: 1.5,
        backgroundColor: '#ffffff',
        chart: chartConfig,
      }),
    });

    if (!res.ok) {
      console.warn('QuickChart API devolvió status:', res.status);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn('Error al solicitar gráfico a QuickChart:', error);
    return null;
  }
}

/** 1. Barras horizontales: Horas por pasante vs 96h */
export async function generarGraficoPasantesHoras(pasantes: { nombre: string; horas_mes: number; horas_acumuladas: number }[]): Promise<Buffer | null> {
  if (!pasantes || pasantes.length === 0) return null;

  const labels = pasantes.map(p => p.nombre);
  const dataMes = pasantes.map(p => p.horas_mes);
  const dataAcumulada = pasantes.map(p => p.horas_acumuladas);

  const config = {
    type: 'horizontalBar',
    data: {
      labels,
      datasets: [
        {
          label: 'Horas Mes',
          backgroundColor: '#003366',
          data: dataMes,
        },
        {
          label: 'Horas Acumuladas',
          backgroundColor: '#FFD700',
          data: dataAcumulada,
        },
      ],
    },
    options: {
      title: { display: true, text: 'Horas Acreditadas por Pasante (Tope 96h)', fontSize: 16 },
      scales: {
        xAxes: [{ ticks: { beginAtZero: true, max: 100 } }],
      },
    },
  };

  return solicitarGraficoQuickChart(config, 800, Math.max(350, pasantes.length * 40));
}

/** 2. Barras: Asistencia promedio o total por espacio */
export async function generarGraficoAsistenciaEspacios(espacios: { espacio_nombre: string; sesiones_aprobadas: number; beneficiarios_atendidos: number }[]): Promise<Buffer | null> {
  if (!espacios || espacios.length === 0) return null;

  const labels = espacios.map(e => e.espacio_nombre);
  const sesiones = espacios.map(e => e.sesiones_aprobadas);
  const beneficiarios = espacios.map(e => e.beneficiarios_atendidos);

  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Sesiones Aprobadas',
          backgroundColor: '#003366',
          data: sesiones,
        },
        {
          label: 'Beneficiarios Atendidos',
          backgroundColor: '#2E7D32',
          data: beneficiarios,
        },
      ],
    },
    options: {
      title: { display: true, text: 'Sesiones y Beneficiarios por Espacio de Enseñanza', fontSize: 16 },
      scales: { yAxes: [{ ticks: { beginAtZero: true } }] },
    },
  };

  return solicitarGraficoQuickChart(config, 800, 400);
}

/** 3. Pastel: Género de beneficiarios */
export async function generarGraficoGenero(generoData: Record<string, number>): Promise<Buffer | null> {
  if (!generoData) return null;

  const labels = Object.keys(generoData).map(g => g.charAt(0).toUpperCase() + g.slice(1).replace('_', ' '));
  const data = Object.values(generoData);

  const config = {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          backgroundColor: ['#003366', '#D32F2F', '#7B1FA2', '#757575'],
          data,
        },
      ],
    },
    options: {
      title: { display: true, text: 'Distribución de Beneficiarios por Género', fontSize: 16 },
    },
  };

  return solicitarGraficoQuickChart(config, 600, 380);
}

/** 4. Barras: Rango de edad de beneficiarios */
export async function generarGraficoEdad(edadData: Record<string, number>): Promise<Buffer | null> {
  if (!edadData) return null;

  const labels = Object.keys(edadData);
  const data = Object.values(edadData);

  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Beneficiarios',
          backgroundColor: '#003366',
          data,
        },
      ],
    },
    options: {
      title: { display: true, text: 'Distribución de Beneficiarios por Rango de Edad', fontSize: 16 },
      scales: { yAxes: [{ ticks: { beginAtZero: true } }] },
    },
  };

  return solicitarGraficoQuickChart(config, 700, 380);
}

/** 5. Curva: Evolución acumulada por mes */
export async function generarGraficoEvolucionMensual(evolucion: { mes: string; sesiones: number; horas: number }[]): Promise<Buffer | null> {
  if (!evolucion || evolucion.length === 0) return null;

  const labels = evolucion.map(e => e.mes);
  const sesiones = evolucion.map(e => e.sesiones);
  const horas = evolucion.map(e => e.horas);

  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Sesiones Realizadas',
          borderColor: '#003366',
          fill: false,
          data: sesiones,
        },
        {
          label: 'Horas Pasantes Acumuladas',
          borderColor: '#FFD700',
          fill: false,
          data: horas,
        },
      ],
    },
    options: {
      title: { display: true, text: 'Evolución Mensual del Proyecto', fontSize: 16 },
      scales: { yAxes: [{ ticks: { beginAtZero: true } }] },
    },
  };

  return solicitarGraficoQuickChart(config, 800, 400);
}

/** 6. Barras: Planificado vs Ejecutado (Metas) */
export async function generarGraficoPlanVsEjecutado(metas: {
  meta_estudiantes?: number;
  estudiantes_reales?: number;
  meta_docentes?: number;
  docentes_reales?: number;
  meta_beneficiarios_directos?: number;
  beneficiarios_directos_reales?: number;
}): Promise<Buffer | null> {
  if (!metas) return null;

  const labels = ['Pasantes', 'Docentes', 'Beneficiarios Directos'];
  const planificado = [metas.meta_estudiantes || 0, metas.meta_docentes || 0, metas.meta_beneficiarios_directos || 0];
  const ejecutado = [metas.estudiantes_reales || 0, metas.docentes_reales || 0, metas.beneficiarios_directos_reales || 0];

  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Planificado (Meta)',
          backgroundColor: '#9E9E9E',
          data: planificado,
        },
        {
          label: 'Ejecutado (Real)',
          backgroundColor: '#003366',
          data: ejecutado,
        },
      ],
    },
    options: {
      title: { display: true, text: 'Participación: Planificado vs. Ejecutado', fontSize: 16 },
      scales: { yAxes: [{ ticks: { beginAtZero: true } }] },
    },
  };

  return solicitarGraficoQuickChart(config, 800, 400);
}

export async function generarGraficoAvanceTareas(tareas: { codigo: string; avance: number | null }[]): Promise<Buffer | null> {
  if (!tareas || tareas.length === 0) return null;
  const config = {
    type: 'horizontalBar',
    data: {
      labels: tareas.map(tarea => `Tarea ${tarea.codigo}`),
      datasets: [{ label: 'Avance (%)', backgroundColor: '#003366', data: tareas.map(tarea => tarea.avance ?? 0) }],
    },
    options: {
      title: { display: true, text: 'Avance del proyecto por tarea del periodo (%)', fontSize: 16 },
      legend: { display: false },
      scales: { xAxes: [{ ticks: { beginAtZero: true, max: 100 } }] },
    },
  };
  return solicitarGraficoQuickChart(config, 800, Math.max(300, tareas.length * 55));
}
