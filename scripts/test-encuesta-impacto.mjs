// Prueba la validación compartida de la encuesta (sin base de datos).
// Uso: npx tsx scripts/test-encuesta-impacto.mjs
import { validarEncuesta, DATOS_ENCUESTA_VACIOS } from '../lib/encuestaImpacto.ts';

const pasantes = [
  { id: 10, nombre: 'Ana Pérez', sesionesCompartidas: 3 },
  { id: 11, nombre: 'Luis Mora', sesionesCompartidas: 1 },
];

const completa = {
  ...DATOS_ENCUESTA_VACIOS,
  nivel_satisfaccion: 4, aprendizaje: 4, mejora: 3, recursos: 5,
  impacto_estudios: 4, uso_aprendido: 3, seguridad_hablar: 5, oportunidades: 4,
  recomendaria: 9,
  evaluaciones_pasantes: {
    10: { calificacion: 5, no_aplica: false, observacion: 'Que siga igual' },
    11: { calificacion: null, no_aplica: true, observacion: '' },
  },
};

let fallos = 0;
const caso = (nombre, datos, opciones, esperaError) => {
  const error = validarEncuesta(datos, pasantes, opciones);
  const ok = esperaError ? !!error : error === null;
  if (!ok) fallos++;
  console.log(`${ok ? 'OK ' : 'FALLO'} ${nombre}${error ? ` -> ${error}` : ''}`);
};

caso('encuesta completa', completa, { requiereImpacto: true }, false);
caso('vacía (sin 5 por defecto)', DATOS_ENCUESTA_VACIOS, { requiereImpacto: true }, true);
caso('falta una pregunta de impacto', { ...completa, oportunidades: null }, { requiereImpacto: true }, true);
caso('falta NPS', { ...completa, recomendaria: null }, { requiereImpacto: true }, true);
caso('NPS fuera de rango', { ...completa, recomendaria: 11 }, { requiereImpacto: true }, true);
caso('pre-encuesta sin impacto', { ...completa, impacto_estudios: null, uso_aprendido: null, seguridad_hablar: null, oportunidades: null, recomendaria: null }, { requiereImpacto: false }, false);
caso('pasante sin calificar ni "no aplica"', { ...completa, evaluaciones_pasantes: { 10: completa.evaluaciones_pasantes[10] } }, { requiereImpacto: true }, true);
caso('califica a alguien que no coincidió', { ...completa, evaluaciones_pasantes: { ...completa.evaluaciones_pasantes, 99: { calificacion: 5, no_aplica: false, observacion: '' } } }, { requiereImpacto: true }, true);
caso('nota 6 inválida', { ...completa, evaluaciones_pasantes: { ...completa.evaluaciones_pasantes, 10: { calificacion: 6, no_aplica: false, observacion: '' } } }, { requiereImpacto: true }, true);
caso('observación demasiado larga', { ...completa, evaluaciones_pasantes: { ...completa.evaluaciones_pasantes, 10: { calificacion: 4, no_aplica: false, observacion: 'x'.repeat(501) } } }, { requiereImpacto: true }, true);

console.log(fallos === 0 ? '\nTodo en verde' : `\n${fallos} caso(s) fallaron`);
process.exit(fallos === 0 ? 0 : 1);
