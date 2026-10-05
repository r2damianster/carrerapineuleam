// Encuesta de satisfacción + impacto percibido + evaluación de los pasantes con los que
// el beneficiario realmente trabajó. Sin imports de Node: lo usan tanto las APIs como los
// formularios (cliente), para que la validación sea idéntica en ambos lados.

export type ConsultaSql = (texto: string, parametros: unknown[]) => Promise<any[]>;

export type OrigenEncuesta = 'qr_beneficiario' | 'panel_pasante' | 'panel_docente';

export const MAX_CARACTERES_OBSERVACION = 500;

export const PREGUNTAS_SATISFACCION = [
  { clave: 'nivel_satisfaccion', texto: '¿Qué tan satisfecho(a) estás con el programa?' },
  { clave: 'aprendizaje', texto: '¿Sientes que aprendiste?' },
  { clave: 'mejora', texto: '¿Sientes que mejoró tu nivel de inglés?' },
  { clave: 'recursos', texto: '¿Cómo calificas los recursos y materiales usados?' },
] as const;

// Primero estudios, después trabajo: casi todos los beneficiarios son estudiantes.
export const PREGUNTAS_IMPACTO = [
  { clave: 'impacto_estudios', texto: 'El club de inglés me ayudó a mejorar mi desempeño en mis estudios (o en mi trabajo, si trabajas).' },
  { clave: 'uso_aprendido', texto: 'Uso lo aprendido en mis estudios o en mi trabajo.' },
  { clave: 'seguridad_hablar', texto: 'Me siento más seguro(a) hablando inglés.' },
  { clave: 'oportunidades', texto: 'El club me abre más oportunidades académicas o laborales.' },
] as const;

export const ETIQUETAS_ACUERDO = [
  'Totalmente en desacuerdo',
  'En desacuerdo',
  'Ni de acuerdo ni en desacuerdo',
  'De acuerdo',
  'Totalmente de acuerdo',
];

export const TEXTO_RECOMENDARIA = '¿Qué tan probable es que recomiendes el club de inglés a otra persona? (0 = nada probable, 10 = muy probable)';

export interface EvaluacionPasante {
  calificacion: number | null;
  no_aplica: boolean;
  observacion: string;
}

export interface DatosEncuesta {
  nivel_satisfaccion: number | null;
  aprendizaje: number | null;
  mejora: number | null;
  recursos: number | null;
  impacto_estudios: number | null;
  uso_aprendido: number | null;
  seguridad_hablar: number | null;
  oportunidades: number | null;
  recomendaria: number | null;
  comentarios: string;
  evaluaciones_pasantes: Record<number, EvaluacionPasante>;
}

export interface PasanteAEvaluar {
  id: number;
  nombre: string;
  sesionesCompartidas: number;
}

export const DATOS_ENCUESTA_VACIOS: DatosEncuesta = {
  nivel_satisfaccion: null,
  aprendizaje: null,
  mejora: null,
  recursos: null,
  impacto_estudios: null,
  uso_aprendido: null,
  seguridad_hablar: null,
  oportunidades: null,
  recomendaria: null,
  comentarios: '',
  evaluaciones_pasantes: {},
};

export const EVALUACION_PASANTE_VACIA: EvaluacionPasante = { calificacion: null, no_aplica: false, observacion: '' };

const esEstrella = (valor: unknown) => Number.isInteger(valor) && (valor as number) >= 1 && (valor as number) <= 5;
const esNps = (valor: unknown) => Number.isInteger(valor) && (valor as number) >= 0 && (valor as number) <= 10;

/**
 * Devuelve el mensaje de error o null si todo está bien. `requiereImpacto` es true en la
 * evaluación final / encuesta suelta (el beneficiario ya recorrió el programa) y false en la
 * pre-encuesta, donde aún no hay nada que valorar.
 */
export function validarEncuesta(
  datos: Partial<DatosEncuesta>,
  pasantes: PasanteAEvaluar[],
  opciones: { requiereImpacto: boolean },
): string | null {
  for (const pregunta of PREGUNTAS_SATISFACCION) {
    if (!esEstrella(datos[pregunta.clave])) {
      return 'Responde todas las preguntas de satisfacción (1 a 5 estrellas).';
    }
  }

  for (const pregunta of PREGUNTAS_IMPACTO) {
    const respuesta = datos[pregunta.clave];
    if (respuesta === null || respuesta === undefined) {
      if (opciones.requiereImpacto) return 'Responde todas las preguntas de impacto del programa.';
    } else if (!esEstrella(respuesta)) {
      return 'Las respuestas de impacto deben estar entre 1 y 5.';
    }
  }
  if (datos.recomendaria === null || datos.recomendaria === undefined) {
    if (opciones.requiereImpacto) return 'Indica qué tan probable es que recomiendes el club (0 a 10).';
  } else if (!esNps(datos.recomendaria)) {
    return 'La recomendación debe estar entre 0 y 10.';
  }

  const evaluaciones = datos.evaluaciones_pasantes || {};
  const idsPermitidos = new Set(pasantes.map(pasante => pasante.id));
  for (const idTexto of Object.keys(evaluaciones)) {
    if (!idsPermitidos.has(Number(idTexto))) {
      return 'Se calificó a alguien con quien el beneficiario no trabajó en este espacio.';
    }
  }
  for (const pasante of pasantes) {
    const evaluacion = evaluaciones[pasante.id];
    if (!evaluacion) return `Califica a ${pasante.nombre} o marca "No aplica".`;
    if (!evaluacion.no_aplica && !esEstrella(evaluacion.calificacion)) {
      return `Califica a ${pasante.nombre} (1 a 5) o marca "No aplica".`;
    }
    if ((evaluacion.observacion || '').length > MAX_CARACTERES_OBSERVACION) {
      return `La observación para ${pasante.nombre} es demasiado larga (máximo ${MAX_CARACTERES_OBSERVACION} caracteres).`;
    }
  }
  return null;
}

/**
 * Pasantes con los que el beneficiario realmente trabajó: los que estuvieron en alguna sesión
 * (no rechazada) a la que él asistió, incluidos los invitados de otros espacios. Si no hay
 * asistencia registrada (beneficiario nuevo o registros anteriores a la Sesión 43) cae a la
 * lista completa del espacio para no bloquear la encuesta.
 */
export async function pasantesAEvaluar(
  consulta: ConsultaSql,
  espacioId: number,
  beneficiarioId?: number | null,
): Promise<{ pasantes: PasanteAEvaluar[]; porCoincidencia: boolean }> {
  if (beneficiarioId) {
    const coincidencias = await consulta(
      `SELECT u.id, u.nombres, u.apellidos, COUNT(DISTINCT ae.id)::int AS sesiones
       FROM asistencia_beneficiarios ab
       JOIN asistencia_espacio ae ON ae.id = ab.asistencia_id
       JOIN asistencia_instructores ai ON ai.asistencia_id = ae.id
       JOIN usuarios u ON u.id = ai.usuario_id
       WHERE ab.beneficiario_id = $1 AND ae.espacio_id = $2 AND ae.estado_aprobacion <> 'rechazado'
       GROUP BY u.id, u.nombres, u.apellidos
       ORDER BY sesiones DESC, u.apellidos`,
      [beneficiarioId, espacioId],
    );
    if (coincidencias.length > 0) {
      return {
        porCoincidencia: true,
        pasantes: coincidencias.map(fila => ({
          id: fila.id,
          nombre: `${fila.nombres} ${fila.apellidos}`,
          sesionesCompartidas: Number(fila.sesiones),
        })),
      };
    }
  }

  const delEspacio = await consulta(
    `SELECT u.id, u.nombres, u.apellidos
     FROM espacio_instructores ei JOIN usuarios u ON u.id = ei.usuario_id
     WHERE ei.espacio_id = $1 ORDER BY u.apellidos`,
    [espacioId],
  );
  return {
    porCoincidencia: false,
    pasantes: delEspacio.map(fila => ({ id: fila.id, nombre: `${fila.nombres} ${fila.apellidos}`, sesionesCompartidas: 0 })),
  };
}

export interface ParametrosGuardarEncuesta {
  beneficiarioId: number;
  cicloId: number | null;
  espacioId: number;
  origen: OrigenEncuesta;
  registradoPor: number | null;
  datos: DatosEncuesta;
  pasantes: PasanteAEvaluar[];
}

/** Inserta la encuesta y la evaluación de cada pasante. Usar dentro de una transacción si la hay. */
export async function guardarEncuesta(consulta: ConsultaSql, parametros: ParametrosGuardarEncuesta): Promise<number> {
  const { datos } = parametros;
  const [encuesta] = await consulta(
    `INSERT INTO encuestas_satisfaccion
       (beneficiario_id, ciclo_id, espacio_id, origen, registrado_por,
        nivel_satisfaccion, aprendizaje, mejora, recursos,
        impacto_estudios, uso_aprendido, seguridad_hablar, oportunidades, recomendaria, comentarios)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id`,
    [
      parametros.beneficiarioId, parametros.cicloId, parametros.espacioId, parametros.origen, parametros.registradoPor,
      datos.nivel_satisfaccion, datos.aprendizaje, datos.mejora, datos.recursos,
      datos.impacto_estudios ?? null, datos.uso_aprendido ?? null, datos.seguridad_hablar ?? null,
      datos.oportunidades ?? null, datos.recomendaria ?? null, (datos.comentarios || '').trim() || null,
    ],
  );

  for (const pasante of parametros.pasantes) {
    const evaluacion = datos.evaluaciones_pasantes[pasante.id];
    await consulta(
      `INSERT INTO encuesta_evaluaciones_instructor
         (encuesta_id, instructor_id, calificacion, no_aplica, observacion, sesiones_compartidas)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        encuesta.id, pasante.id,
        evaluacion.no_aplica ? null : evaluacion.calificacion,
        !!evaluacion.no_aplica,
        (evaluacion.observacion || '').trim() || null,
        pasante.sesionesCompartidas,
      ],
    );
  }
  return encuesta.id;
}
