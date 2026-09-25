// Género de las personas (usuarios.genero). Valores guardados y etiquetas visibles.
// Es un dato obligatorio en el registro inicial de todo beneficiario (panel y enlace público).
export const OPCIONES_GENERO = [
  { valor: 'femenino', etiqueta: 'Femenino' },
  { valor: 'masculino', etiqueta: 'Masculino' },
  { valor: 'otro', etiqueta: 'Otro' },
  { valor: 'prefiero_no_decir', etiqueta: 'Prefiero no decir' },
] as const;

export const GENEROS_VALIDOS: string[] = OPCIONES_GENERO.map(opcion => opcion.valor);

export function esGeneroValido(valor: unknown): valor is string {
  return typeof valor === 'string' && GENEROS_VALIDOS.includes(valor);
}
