# ANTIGRAVITY.md — Proyecto Innovaciones Pedagógicas e Internacionalización

> Instrucciones de contexto y colaboración para **Antigravity (AGY)**.
> **Importante:** Este proyecto se desarrolla en conjunto con **Claude Code**. Ambos agentes comparten contexto, responsabilidades y deben coordinarse a través de la documentación.

---

## 🤖 Modelo de Colaboración Dual (Antigravity + Claude)

Este repositorio utiliza un enfoque de inteligencia artificial colaborativa.

- **Antigravity (Tú):** Encargado de la arquitectura general, automatizaciones complejas, manejo de herramientas de sistema (lean-ctx, MCPs), decisiones de diseño profundas y refactorizaciones de alto nivel. Eres el orquestador principal.
- **Claude Code:** Encargado de implementaciones puntuales, revisiones de código rápidas, ajustes de UI (Tailwind) y tareas de mantenimiento del día a día.

### Reglas de Sincronización
1. **Compartir Estado:** Cada vez que realices un cambio estructural importante, actualiza el archivo `CLAUDE.md` para que Claude esté enterado de las nuevas convenciones o cambios en la base de datos estática (`lib/data.ts`).
2. **Respetar Tareas:** Si un requerimiento es mejor manejado por Claude (ej. un ajuste menor de CSS), puedes sugerirle al usuario delegarlo.
3. **Skills Compartidos:** Utilizar las convenciones y directrices de UI y TypeScript definidas conjuntamente. Ambos asumen que la fuente de verdad es `lib/data.ts`.

---

## 🛠️ Stack y Reglas (Heredadas)
- **Frontend:** Next.js 14 (App Router) + TypeScript estricto.
- **Estilos:** TailwindCSS (Colores ULEAM: `#003366`, `#FFD700`).
- **Base de datos:** Estática in-memory en `lib/data.ts`. NO usamos PocketBase (fue eliminado).
- **Archivos de acceso:**
  - `public/images/` y `public/files/` para recursos públicos.
  - `public/admin-assets/` para recursos privados protegidos.

## 📌 Estado Actual y Tareas
*(Ver `CLAUDE.md` para el changelog detallado y estado general)*
- El proyecto está en versión 0.9.x
- Recientemente se integraron múltiples proyectos (Docencia, Investigación, Vinculación).
- **Tu misión actual:** Mantener esta interoperabilidad entre IA y ayudar al usuario a establecer el proceso de desarrollo conjunto.
