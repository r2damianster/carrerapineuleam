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
- El proyecto está en versión 0.10.3 (Sesión 22, 2026-09-01)
- **Sesión 22 — ⚠️ `/registro` ya NO ofrece `beneficiario` como rol autoregistrable.** `PUBLIC_ROLES` en `app/api/auth/register/route.ts` quedó en `['profesor']` únicamente — el registro de beneficiario seguía vivo desde antes de Sesión 19 y usaba la columna `situacion_laboral` que se eliminó en Sesión 21, así que estaba devolviendo 500 en producción hasta que se corrigió. Si necesitas tocar `/registro` o `POST /api/auth/register`, recuerda: **beneficiario nunca se autoregistra**, se crea desde `/vinculacion/beneficiarios` (`POST /api/beneficiarios`); **estudiante tampoco**, se crea desde `/vinculacion/pasantes` (`POST /api/estudiantes` o `/api/estudiantes/bulk`).
- El Portal PINE (Neon) se construyó en la Sesión 19 (2026-08-30) — auth unificada, áreas Vinculación/Investigación separadas, permisos por espacio, Gestión de Carrera.
- **Sesión 20:** carga masiva de pasantes por Excel — `POST /api/estudiantes/bulk` (modo `dryRun` para vista previa, luego inserta), UI en `/vinculacion/pasantes`. Usa `xlsx` (SheetJS), nueva dependencia.
- **Sesión 21 — ⚠️ `perfiles_beneficiarios` cambió de esquema:** la columna `situacion_laboral` (texto libre) **ya no existe**, fue reemplazada por `edad`, `tiene_discapacidad`/`tipo_discapacidad`, `situacion_ocupacional` (`solo_estudia`\|`estudia_trabaja`\|`solo_trabaja`\|`desempleado_no_estudia`) + condicionales `rol_laboral`/`nivel_educativo` (`universidad`\|`colegio`\|`escuela`)/`carrera`/`curso`. Si vas a tocar `POST /api/beneficiarios` o el formulario en `/vinculacion/beneficiarios`, usa las columnas nuevas — no repongas `situacion_laboral`. Ver `scripts/migrate-beneficiarios-perfil.js` y `CLAUDE.md` → `## Portal PINE` para el detalle completo.
- **Sesión 21:** `/vinculacion/asistencia` ahora precarga los beneficiarios del espacio con el checkbox de "presente" ya marcado por defecto — el instructor desmarca ausentes en vez de marcar uno por uno.
- **`modulos_acceso` tiene 4 valores, no confundirlos:** `admin` (solo `/pine-dashboard`, indicadores), `contenido_sitio` (panel `/admin` de contenido del sitio — **restringido solo a Arturo y Jhonny**, no lo agregues a nadie más sin que el usuario lo pida explícitamente), `investigacion`, `vinculacion`. Cambiar `lib/data.ts:profesorModulos` **no actualiza retroactivamente** a quien ya se registró en Neon — hace falta un `UPDATE usuarios SET modulos_acceso = ...` aparte para cuentas existentes.
- **Antes de pushear cambios de esquema o auth:** correr `git fetch && git log HEAD..origin/main --oneline` — hubo varias rondas esta sesión donde pushes directos de Antigravity y Claude sin coordinar rompieron cosas en producción (secreto hardcodeado, panel admin bloqueado sin condición, dos cookies de sesión sin relación entre sí). Si vas a tocar `lib/session.ts`, `middleware.ts`, o el esquema de `usuarios`/`espacios_enseñanza`, lee primero la sección `## Portal PINE` de `CLAUDE.md` completa.
- **Nunca crear tablas en Neon fuera de un script en `scripts/`** (commiteado a git) — hay 5 tablas (`avance_investigacion`, `seguimiento_laboral`, `eventos_difusion`, `eventos_estudiantes`, `encuesta_satisfaccion`) creadas así, sin documentar, que el usuario no reconoce.
- **⚠️ Nunca inventar personas, emails o proyectos.** Pasó dos veces en la Sesión 19: emails adivinados para Cristina/Johana (`seed-roles.js`), y una persona completa fabricada — "Mg. Veronika Vera", con su propio proyecto "Mentoría Lingüística" y página pública — que tuvo que eliminarse porque no existía. Si necesitas el email o el rol de alguien y no está confirmado en el código o en lo que el usuario ya dijo, **pregunta antes de escribirlo** — no lo completes con un dato plausible.
- **Tu misión actual:** Mantener esta interoperabilidad entre IA y ayudar al usuario a establecer el proceso de desarrollo conjunto.
