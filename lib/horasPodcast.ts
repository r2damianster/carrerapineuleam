// Cálculo de horas acreditables por episodio de podcast de Vinculación —
// tabla confirmada por el usuario (Sesión 38). Solo aplica cuando el área
// sustantiva del podcast es 'vinculacion'; en docencia/investigación no se
// acreditan horas. El tipo de episodio se deriva automáticamente de a quién
// se marcó como invitado (no hay selector manual aparte, decisión del
// usuario: evita inconsistencias entre "quién participó" y "qué categoría").

export type TipoPodcast = 'solitario' | 'interno' | 'externo';

export interface DesgloseHorasPodcast {
  tipoPodcast: TipoPodcast;
  panelistasInternosAdicionales: number;
  panelistasExternosAdicionales: number;
  horasBase: number;
  horasBonoPanelistas: number;
  horasBonoAudiencia: number;
  horasTotal: number;
}

const HORAS_BASE: Record<TipoPodcast, number> = {
  solitario: 3,
  interno: 5,
  externo: 8,
};

function bonoAudiencia(audienciaAlcanzada: number): number {
  if (audienciaAlcanzada > 20) return 3;
  if (audienciaAlcanzada >= 11) return 2;
  if (audienciaAlcanzada >= 1) return 1;
  return 0;
}

export function calcularHorasPodcast(params: {
  invitadosInternosCount: number;
  invitadosExternosCount: number;
  audienciaAlcanzada: number;
}): DesgloseHorasPodcast {
  const { invitadosInternosCount, invitadosExternosCount, audienciaAlcanzada } = params;

  const tipoPodcast: TipoPodcast =
    invitadosExternosCount > 0 ? 'externo' : invitadosInternosCount > 0 ? 'interno' : 'solitario';

  // El primer invitado de cada tipo ya está cubierto por la categoría base
  // (Invitado Interno / Invitado Externo) — solo los adicionales generan bono.
  const panelistasExternosAdicionales = tipoPodcast === 'externo' ? Math.max(0, invitadosExternosCount - 1) : 0;
  // Si el tipo base ya es 'externo', el/los invitado(s) interno(s) no tienen
  // slot "base" propio (ese lo ocupó el externo) — todos cuentan como adicionales.
  const panelistasInternosAdicionales =
    tipoPodcast === 'interno' ? Math.max(0, invitadosInternosCount - 1) : invitadosInternosCount;

  const horasBase = HORAS_BASE[tipoPodcast];
  const horasBonoPanelistas = panelistasInternosAdicionales * 1 + panelistasExternosAdicionales * 2;
  const horasBonoAudiencia = bonoAudiencia(audienciaAlcanzada);

  return {
    tipoPodcast,
    panelistasInternosAdicionales,
    panelistasExternosAdicionales,
    horasBase,
    horasBonoPanelistas,
    horasBonoAudiencia,
    horasTotal: horasBase + horasBonoPanelistas + horasBonoAudiencia,
  };
}

// Inserta una fila de horas acreditables por cada estudiante participante —
// cada uno recibe el total completo del episodio (no se reparte entre
// coequiperos), ya que refleja el tiempo que cada quien invirtió en
// preparación/grabación, no un recurso a dividir. Solo se llama cuando
// areaSustantiva === 'vinculacion' (llamado condicionalmente por el caller).
// Las horas quedan "pendientes" hasta que el video se aprueba en
// /admin/videos — eso se resuelve en la lectura (JOIN con videos.aprobado_sitio),
// no acá, para no depender de un hook en el endpoint de aprobación.
export async function registrarHorasPodcast(
  sql: any,
  {
    videoId,
    participantesEstudiantes,
    invitadosInternos,
    invitadosExternos,
    audienciaAlcanzada,
  }: {
    videoId: string;
    participantesEstudiantes: number[];
    invitadosInternos: string[];
    invitadosExternos: string[];
    audienciaAlcanzada: number;
  }
) {
  if (!participantesEstudiantes || participantesEstudiantes.length === 0) return;

  const desglose = calcularHorasPodcast({
    invitadosInternosCount: invitadosInternos?.length || 0,
    invitadosExternosCount: invitadosExternos?.length || 0,
    audienciaAlcanzada: audienciaAlcanzada || 0,
  });

  for (const usuarioId of participantesEstudiantes) {
    await sql`
      INSERT INTO horas_podcast_pasante
        (video_id, usuario_id, tipo_podcast, panelistas_internos_adicionales, panelistas_externos_adicionales,
         audiencia_alcanzada, horas_base, horas_bono_panelistas, horas_bono_audiencia, horas_total)
      VALUES
        (${videoId}, ${usuarioId}, ${desglose.tipoPodcast}, ${desglose.panelistasInternosAdicionales}, ${desglose.panelistasExternosAdicionales},
         ${audienciaAlcanzada || 0}, ${desglose.horasBase}, ${desglose.horasBonoPanelistas}, ${desglose.horasBonoAudiencia}, ${desglose.horasTotal})
      ON CONFLICT (video_id, usuario_id) DO UPDATE SET
        tipo_podcast = EXCLUDED.tipo_podcast,
        panelistas_internos_adicionales = EXCLUDED.panelistas_internos_adicionales,
        panelistas_externos_adicionales = EXCLUDED.panelistas_externos_adicionales,
        audiencia_alcanzada = EXCLUDED.audiencia_alcanzada,
        horas_base = EXCLUDED.horas_base,
        horas_bono_panelistas = EXCLUDED.horas_bono_panelistas,
        horas_bono_audiencia = EXCLUDED.horas_bono_audiencia,
        horas_total = EXCLUDED.horas_total
      WHERE horas_podcast_pasante.estado_aprobacion <> 'aprobado'
    `;
  }
}
