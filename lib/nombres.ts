// Nombres propios con mayúscula inicial en cada palabra y sin espacios sobrantes.
// Se aplica al registrar personas para que nunca vuelvan a entrar en mayúsculas completas
// ni con espacios dobles. Las partículas (de, del, la, las, los, y) quedan en minúscula
// salvo al inicio del nombre.
const PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y', 'e'];

function capitalizar(fragmento: string): string {
  return fragmento.charAt(0).toUpperCase() + fragmento.slice(1);
}

export function normalizarNombrePropio(texto: string | null | undefined): string {
  const limpio = String(texto ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!limpio) return '';
  return limpio
    .split(' ')
    .map((palabra, posicion) => {
      if (posicion > 0 && PARTICULAS.includes(palabra)) return palabra;
      return palabra.split('-').map(capitalizar).join('-');
    })
    .join(' ');
}
