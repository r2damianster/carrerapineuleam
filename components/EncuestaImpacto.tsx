'use client';

import StarRating from '@/components/StarRating';
import {
  ETIQUETAS_ACUERDO,
  EVALUACION_PASANTE_VACIA,
  MAX_CARACTERES_OBSERVACION,
  PREGUNTAS_IMPACTO,
  PREGUNTAS_SATISFACCION,
  TEXTO_RECOMENDARIA,
  type DatosEncuesta,
  type EvaluacionPasante,
  type PasanteAEvaluar,
} from '@/lib/encuestaImpacto';

interface EncuestaImpactoProps {
  datos: DatosEncuesta;
  onChange: (datos: DatosEncuesta) => void;
  pasantes: PasanteAEvaluar[];
  porCoincidencia: boolean;
  /** false en la pre-encuesta: aún no hay nada que valorar del programa. */
  mostrarImpacto: boolean;
}

// Bloque único de encuesta, reutilizado por evaluación final, encuesta suelta y enlace público.
// Nada viene marcado de antemano: cada respuesta tiene que ser una elección real.
export default function EncuestaImpacto({ datos, onChange, pasantes, porCoincidencia, mostrarImpacto }: EncuestaImpactoProps) {
  const actualizarCampo = (campo: keyof DatosEncuesta, valor: DatosEncuesta[keyof DatosEncuesta]) =>
    onChange({ ...datos, [campo]: valor });

  const actualizarEvaluacion = (pasanteId: number, cambios: Partial<EvaluacionPasante>) => {
    const actual = datos.evaluaciones_pasantes[pasanteId] ?? EVALUACION_PASANTE_VACIA;
    onChange({
      ...datos,
      evaluaciones_pasantes: { ...datos.evaluaciones_pasantes, [pasanteId]: { ...actual, ...cambios } },
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {PREGUNTAS_SATISFACCION.map(pregunta => (
          <StarRating
            key={pregunta.clave}
            label={pregunta.texto}
            value={datos[pregunta.clave]}
            onChange={valor => actualizarCampo(pregunta.clave, valor)}
          />
        ))}
      </div>

      {mostrarImpacto && (
        <div className="pt-6 border-t space-y-6">
          <h4 className="text-center text-sm font-semibold text-gray-600">Cuánto te sirvió el programa</h4>
          {PREGUNTAS_IMPACTO.map(pregunta => (
            <fieldset key={pregunta.clave}>
              <legend className="block text-sm font-bold text-gray-800 mb-2 text-center">{pregunta.texto}</legend>
              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {ETIQUETAS_ACUERDO.map((etiqueta, indice) => {
                  const valor = indice + 1;
                  const seleccionado = datos[pregunta.clave] === valor;
                  return (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => actualizarCampo(pregunta.clave, valor)}
                      className={`px-1 py-2 text-[11px] sm:text-xs leading-tight rounded-md border transition-colors ${
                        seleccionado ? 'bg-uleam-blue text-white border-uleam-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {etiqueta}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <fieldset>
            <legend className="block text-sm font-bold text-gray-800 mb-2 text-center">{TEXTO_RECOMENDARIA}</legend>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, valor) => {
                const seleccionado = datos.recomendaria === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => actualizarCampo('recomendaria', valor)}
                    className={`py-2 text-sm rounded-md border transition-colors ${
                      seleccionado ? 'bg-uleam-blue text-white border-uleam-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {valor}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      {pasantes.length > 0 && (
        <div className="pt-6 border-t space-y-6">
          <div className="text-center">
            <h4 className="text-sm font-semibold text-gray-600">
              {porCoincidencia ? 'Califica a quienes te acompañaron' : 'Califica a los pasantes del espacio'}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Tu opinión es anónima para el pasante: solo verá promedios y comentarios sin tu nombre.
            </p>
          </div>
          {pasantes.map(pasante => {
            const evaluacion = datos.evaluaciones_pasantes[pasante.id] ?? EVALUACION_PASANTE_VACIA;
            return (
              <div key={pasante.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-gray-800">{pasante.nombre}</p>
                  {porCoincidencia && pasante.sesionesCompartidas > 0 && (
                    <span className="text-xs text-gray-500">
                      Coincidieron en {pasante.sesionesCompartidas} sesión{pasante.sesionesCompartidas === 1 ? '' : 'es'}
                    </span>
                  )}
                </div>
                {!evaluacion.no_aplica && (
                  <StarRating
                    label="¿Cómo calificas su acompañamiento?"
                    value={evaluacion.calificacion}
                    onChange={valor => actualizarEvaluacion(pasante.id, { calificacion: valor })}
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={evaluacion.no_aplica}
                    onChange={evento => actualizarEvaluacion(pasante.id, { no_aplica: evento.target.checked, calificacion: null })}
                    className="h-4 w-4"
                  />
                  No aplica (no trabajé con esta persona)
                </label>
                {!evaluacion.no_aplica && (
                  <textarea
                    rows={2}
                    maxLength={MAX_CARACTERES_OBSERVACION}
                    value={evaluacion.observacion}
                    onChange={evento => actualizarEvaluacion(pasante.id, { observacion: evento.target.value })}
                    placeholder="¿Qué le recomendarías? (opcional)"
                    className="block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-2">
        <label className="block text-sm font-bold text-gray-700 mb-2">Comentarios adicionales (opcional)</label>
        <textarea
          rows={4}
          value={datos.comentarios}
          onChange={evento => actualizarCampo('comentarios', evento.target.value)}
          placeholder="¿Qué te gustó más? ¿Qué podemos mejorar?"
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border"
        />
      </div>
    </div>
  );
}
