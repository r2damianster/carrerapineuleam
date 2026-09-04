// Catálogo único de grados/posgrados — antes duplicado en components/TeamSection.tsx
// (GRADO_ABREVIADO/POSGRADO_ABREVIADO) y app/admin/members/page.tsx (GRADO_OPCIONES/
// POSGRADO_OPCIONES). También lo usan las rutas de /api/perfil para mapear el `tipo`
// elegido en un título académico (perfiles_titulos_academicos) a la abreviatura que
// se guarda en usuarios.titulo_grado/post_grado (usado por los documentos de /utilidades).

export const GRADOS_TERCER_NIVEL = ['Licenciado/a', 'Ingeniero/a', 'Doctor/a', 'Psicólogo/a'] as const;
export const GRADOS_CUARTO_NIVEL = ['Magíster', 'PhD'] as const;

export const GRADO_ABREVIADO: Record<string, string> = {
  'Licenciado/a': 'Lic.',
  'Ingeniero/a': 'Ing.',
  'Doctor/a': 'Dr.',
  'Psicólogo/a': 'Psi.',
};

export const POSGRADO_ABREVIADO: Record<string, string> = {
  'Magíster': 'Mg.',
  'PhD': 'PhD.',
};
