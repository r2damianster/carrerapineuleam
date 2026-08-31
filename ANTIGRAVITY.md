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
- **Frontend:** Next.js 14 (App Router) + TypeScript.
- **Estilos:** TailwindCSS (Colores ULEAM: `#003366`, `#FFD700`).
- **Sitio público:** estático in-memory en `lib/data.ts`. NO usamos PocketBase (fue eliminado).
- **Portal PINE** (docencia/vinculación/investigación, `/portal/*`, `/vinculacion/espacios`, `/investigacion/espacios`, `/gestion-carrera`): base de datos real, **Neon Postgres**. Auth unificada en `lib/session.ts` (una sola cookie firmada, `pine_app_session`, para todo el sitio incluido `/admin`). Detalle completo del esquema, roles y permisos en `CLAUDE.md` → sección `## Portal PINE`.
- **Archivos de acceso:**
  - `public/images/` y `public/files/` para recursos públicos.
  - `public/admin-assets/` para recursos privados protegidos.

## 📌 Estado Actual y Tareas
*(Ver `CLAUDE.md` para el changelog detallado y estado general — es la fuente de verdad más actualizada, léela antes de asumir el estado del repo)*
- El proyecto está en versión 0.10.x
- El Portal PINE (Neon) se construyó en la Sesión 19 (2026-08-30) — auth unificada, áreas Vinculación/Investigación separadas, permisos por espacio, Gestión de Carrera.
- **Antes de pushear cambios de esquema o auth:** correr `git fetch && git log HEAD..origin/main --oneline` — hubo varias rondas esta sesión donde pushes directos de Antigravity y Claude sin coordinar rompieron cosas en producción (secreto hardcodeado, panel admin bloqueado sin condición, dos cookies de sesión sin relación entre sí). Si vas a tocar `lib/session.ts`, `middleware.ts`, o el esquema de `usuarios`/`espacios_enseñanza`, lee primero la sección `## Portal PINE` de `CLAUDE.md` completa.
- **Nunca crear tablas en Neon fuera de un script en `scripts/`** (commiteado a git) — hay 5 tablas (`avance_investigacion`, `seguimiento_laboral`, `eventos_difusion`, `eventos_estudiantes`, `encuesta_satisfaccion`) creadas así, sin documentar, que el usuario no reconoce.
- **Tu misión actual:** Mantener esta interoperabilidad entre IA y ayudar al usuario a establecer el proceso de desarrollo conjunto.
