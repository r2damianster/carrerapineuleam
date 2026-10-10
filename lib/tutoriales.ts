// Catálogo de videos tutoriales del Portal PINE.
// Sin imports de Node/Neon: se usa desde páginas y, si hace falta, desde middleware.
// Cada tutorial declara a qué roles (usuarios.rol) se muestra; la página /portal/tutoriales
// filtra por el rol de la sesión. Para agregar uno: copiar el MP4 a public/video/ y sumar
// una entrada aquí.

export interface Tutorial {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: string; // texto para mostrar, ej. "1:26"
  archivo: string; // ruta pública del MP4
  roles: string[]; // valores de usuarios.rol que lo ven
}

export const TUTORIALES: Tutorial[] = [
  {
    id: 'utilidades',
    titulo: 'Utilidades: generadores de documentos',
    descripcion: 'Recorrido por las 6 herramientas de /utilidades: Acta Técnica, Oficios, Convocatorias, PATs de Maestría, Pares Lectores y Certificados.',
    duracion: '1:26',
    archivo: '/video/utilidades-tutorial.mp4',
    roles: ['profesor', 'admin', 'secretaria'],
  },
];

export function tutorialesParaRol(rol: string | undefined | null): Tutorial[] {
  if (!rol) return [];
  return TUTORIALES.filter(tutorial => tutorial.roles.includes(rol));
}
