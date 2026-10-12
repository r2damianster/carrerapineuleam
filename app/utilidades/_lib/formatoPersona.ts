interface PersonaConGrados {
  titulo_grado: string;
  nombre: string;
  post_grado: string;
}

/** "Mg. Juan Pérez, PhD." — sin coma colgante cuando falta el posgrado ni espacio inicial cuando falta el título. */
export function nombreConGrados(persona: PersonaConGrados): string {
  const base = [persona.titulo_grado, persona.nombre].map((parte) => parte.trim()).filter(Boolean).join(" ");
  const posgrado = persona.post_grado.trim();
  return posgrado ? `${base}, ${posgrado}` : base;
}

/** Etiqueta de las listas desplegables: "Mg. Juan Pérez, PhD. — Docente". */
export function etiquetaPersona(persona: PersonaConGrados & { cargo: string }): string {
  const cargo = persona.cargo.trim();
  return cargo ? `${nombreConGrados(persona)} — ${cargo}` : nombreConGrados(persona);
}
