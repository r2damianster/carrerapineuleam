# CLAUDE.md — Proyecto Innovaciones Pedagógicas e Internacionalización

> Instrucciones de contexto para Claude Code. 
> **NUEVO (2026-08-30):** Modelo de colaboración dual activo. Trabajas en conjunto con **Antigravity (AGY)**.

---

## 🤖 Colaboración con Antigravity

- **Antigravity** se encarga de la arquitectura, toma de decisiones complejas, automatizaciones (vía herramientas lean-ctx) y refactorizaciones profundas.
- **Tú (Claude)** te encargarás de la ejecución rápida, ajustes de UI, implementaciones específicas y asistencia continua en el código.
- Ambos agentes leen y actualizan la documentación. Mantén este archivo actualizado si realizas cambios importantes para que Antigravity también tenga contexto, y consulta `ANTIGRAVITY.md` si necesitas conocer reglas globales.

---

## Identidad del Proyecto

**Nombre:** Proyecto Innovaciones Pedagógicas e Internacionalización
**Grupo de Investigación:** Innovaciones pedagógicas para el desarrollo sostenible: inclusión, interculturalidad e interdisciplinaridad (actualización 2026-05-15, doc en `public/admin-assets/2026_GrupoInvestigacion.pdf`)
**Institución:** Universidad Laica Eloy Alfaro de Manabí (ULEAM)
**Repositorio:** https://github.com/r2damianster/carrerapineuleam.git
**Versión actual:** 0.10.5
**Última sesión:** 2026-09-02 (Sesión 27 — módulo /utilidades conectado a la BD real: se descubrió que la tabla `docentes` nunca existió en producción, unificada dentro de `usuarios`; Acta Técnica ahora selecciona docentes igual que Convocatorias/Oficios; eliminada carpeta duplicada `carrera-herramientas/`. Ver detalle abajo)
**Ruta pública del proyecto:** `/investigacion/proyecto-innovacion` (antes `/pine`)
**Manual de usuario:** `MANUAL_USUARIO.md` (rutas del Portal PINE — login, espacios, dashboard)

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | TailwindCSS personalizado (colores ULEAM) |
| Sitio público (contenido) | **Neon Postgres** (SQL crudo vía `@neondatabase/serverless`, igual que el Portal PINE) — miembros, publicaciones, podcast (video_categories/videos), noticias+actividades (`actividades_difusion`, fusionada con Difusión interna). Migrado desde `lib/data.ts` en la Sesión 25; ese archivo ya solo guarda `siteSettings` + config de autorización (`profesoresAutorizados`/`profesorModulos`/`liderProyectoPropio`) + fotos del Club de Inglés. |
| **Portal PINE** (docencia/vinculación/investigación) | **Neon Postgres** vía `@neondatabase/serverless` (SQL crudo) — ver `## Portal PINE` abajo |
| **Contribuciones Académicas** (módulo aparte) | **Mismo Neon**, pero acceso vía **Prisma ORM** (`lib/prisma.ts`, `prisma/schema.prisma`) — único módulo del repo que no usa SQL crudo. Ver `## Portal PINE` → sección Contribuciones |
| Auth | Cookie httpOnly firmada (HMAC, Web Crypto) — `lib/session.ts`, unificada para todo (admin legacy + Portal) |
| Uploads (fotos/evidencias) | Cloudinary (`app/api/upload`) |
| Deploy | Vercel — Next.js en raíz del repo, auto-deploy on push a `main` |

**Dependencias clave (`package.json`):** `@neondatabase/serverless`, `bcryptjs` (hash de passwords del Portal), `cloudinary`, `docx`+`jszip` (generación de certificados y test MCER descargable), `@prisma/client`+`prisma` (módulo Contribuciones, ver nota abajo), `react-hook-form`+`yup`+`@hookform/resolvers` (formulario del wizard de Contribuciones), `zod` (validación de `POST /api/contribuciones`).

> ⚠️ **Prisma en este repo está fijado a `^6.19.3`, no actualizar a 7.x sin revisar.** Prisma 7 rompió el datasource clásico `url = env("DATABASE_URL")` del schema (exige migrar a `prisma.config.ts` + driver adapters) — el schema actual usa el patrón viejo y no compila contra Prisma 7 (Sesión 24).
>
> ⚠️ **Nunca correr `prisma db push` / `prisma migrate` contra este Neon.** `schema.prisma` solo modela `Contribution`/`ContributionAuthor`; el resto de tablas del Portal (`usuarios`, `estudiantes`, `espacios`, etc.) vive fuera del schema de Prisma. Ambos comandos comparan el schema contra **toda** la base y ofrecen **borrar** las tablas que no conocen — confirmado en Sesión 24 (`db push` listó 9 tablas con datos reales para drop, incluida `usuarios`). Para cambios futuros al schema de Contribuciones, escribir el `ALTER`/`CREATE TABLE` a mano (ver `scripts/migrate-contribuciones.js` como plantilla), igual que el resto de migraciones del proyecto.

### Colores ULEAM
- Azul institucional: `#003366`
- Dorado: `#FFD700`

---

## Portal PINE (Neon Postgres) — Sistema Operativo

> **Distinto del sitio público estático.** El sitio público (landing, `/investigacion/proyecto-innovacion`, etc.) sigue siendo 100% `lib/data.ts`. El "Portal PINE" es un sistema aparte con base de datos real (Neon), para las funciones operativas: registrar clubes/aulas, tomar asistencia, evaluar MCER, encuestas, difusión de eventos.

### Auth unificada
- **Una sola cookie httpOnly firmada** (`pine_app_session`, HMAC-SHA256 vía Web Crypto) para *todo* — Portal Y panel `/admin` legacy. Implementada en `lib/session.ts` (`createSessionCookieValue`/`verifySessionCookieValue`/`getAppSessionFromCookies`). Requiere `SESSION_SECRET` en las env vars — **sin fallback hardcodeado** (existió brevemente, se removió por seguridad).
- **Expiración "sliding" de 8 horas (Sesión 27):** la cookie ya es persistente desde siempre (sobrevive a cerrar la pestaña/navegador), pero antes expiraba a fecha fija 4h después del login sin importar si el usuario seguía activo. Ahora `SESSION_MAX_AGE_SECONDS` (`lib/session.ts`) es 8h, y `middleware.ts` reemite la cookie con maxAge completo en cada request autenticado a una ruta protegida (`conSesionRenovada()`) — el usuario se mantiene logueado mientras entre al menos una vez cada 8 horas; solo tras 8h seguidas sin ninguna visita debe volver a loguearse.
- **NO existen ya**: `lib/adminSession.ts`, `lib/userSession.ts`, el panel `/admin` con password `Pine2026` hardcodeado, ni el módulo viejo `/vinculacion/dinamicas-linguisticas/asistencia` (UUID). Todo fue consolidado/retirado en Sesión 19 — si encuentras referencias a esto en código o docs viejos, están obsoletas.
- **Login:** `/portal/login` → `POST /api/auth/portal-login`. **Registro:** `/registro` → `POST /api/auth/register` (autologuea). Desde Sesión 22, `PUBLIC_ROLES = ['profesor']` — es el único rol que se autoregistra; `estudiante` y `beneficiario` fueron retirados del todo del selector (antes `beneficiario` seguía ahí como opción viva y rompía porque insertaba en una columna ya eliminada, ver changelog Sesión 22).
- **Roles** (`usuarios.rol`): `admin` | `profesor` | `estudiante` | `beneficiario`. Autoregistro público solo permite `profesor`/`estudiante`/`beneficiario` — `admin` nunca es autoasignable.
- **`profesor` es de lista fija**, no autoregistro abierto: `lib/data.ts` → `profesoresAutorizados` (array de emails permitidos) + `profesorModulos` (qué `modulos_acceso` recibe cada uno al registrarse). Agregar gente nueva ahí, con su email real confirmado — **nunca adivinar el email**.
- **`modulos_acceso`** (`text[]` en `usuarios`, valores: `admin`/`investigacion`/`vinculacion`/`contenido_sitio`): controla qué ve cada quien en `/portal/dashboard` y qué rutas puede pisar (`middleware.ts`). Una persona puede tener varios. `admin` controla solo `/pine-dashboard` (indicadores). `contenido_sitio` es un módulo **distinto**, restringido solo a `arturo.rodriguez` y `jhonny.villafuerte` (líder/colíder de este proyecto) — controla `/admin/*` (las 10 secciones CRUD del contenido estático) y `/api/protected/assets` (PDFs confidenciales). German y Verónica tienen `admin` pero NO `contenido_sitio` — ven el dashboard de indicadores pero no el panel de contenido.
- **Permisos por espacio** (no globales): `lib/permisos-espacio.ts` → `puedeOperarEspacio(usuario, espacio_id)`. Un `profesor` con módulo `vinculacion` opera cualquier espacio; un `estudiante` **solo** los espacios donde está en `espacio_instructores` (asignado por el profesor). Se usa en `/api/espacios/asignar`, `/api/tests` (MCER), `/api/encuestas`, `/api/espacios/asistencia`.

### Flujo real de Vinculación (confirmado con el usuario, Sesión 19)
Dos conceptos separados, **no anidados uno dentro del otro**:
- **"Espacio" = Gestión, solo profesor** (hoy: Arturo, Cynthia). `/vinculacion/espacios` crea/lista espacios (ej. "Club de Inglés A"); `/vinculacion/espacios/[id]` asigna estudiantes como instructores de ese espacio (única función que queda ahí).
- **"Registro" = tarea diaria, estudiante-instructor o profesor de respaldo.** Cuatro páginas propias, cada una con su propio selector de espacio (un estudiante puede tener varios asignados): `/vinculacion/asistencia`, `/vinculacion/beneficiarios` (asignar existente + registrar uno nuevo), `/vinculacion/test-mcer`, `/vinculacion/encuesta`. Todas reusan las mismas APIs (`/api/espacios/asignar`, `/api/tests`, `/api/encuestas`, `/api/espacios/asistencia`) — el cambio fue solo de UI (páginas planas en vez de tabs dentro del espacio), la lógica de permisos (`puedeOperarEspacio`) no cambió.
- **Beneficiario nunca tiene cuenta.** `POST /api/beneficiarios` los crea sin password real (email/password_hash autogenerados, inutilizables — `usuarios.email`/`password_hash` son `NOT NULL`+`UNIQUE` en Neon) y los asigna al espacio en el mismo paso. Esto reemplazó el plan original de usar `/registro?rol=beneficiario` (que sí les daba cuenta/password) — descartado a propósito, y desde Sesión 22 esa opción ya no existe ni en el código.

### Pasantes (estudiantes-instructores) — alta por el profesor, activación en el primer login
`/vinculacion/pasantes` (solo profesor/admin con módulo `vinculacion`) es un **CRUD completo** — crear, editar, eliminar. Crear un pasante nuevo solo pide nombres/apellidos/email (`POST /api/estudiantes`); queda con `usuarios.activado = false` y un `password_hash` placeholder inutilizable. **No hay pantalla de registro para el pasante** — la primera vez que intenta entrar en `/portal/login` con ese email, `app/api/auth/portal-login/route.ts` detecta `activado = false` y guarda lo que escribió en el campo de password como su clave definitiva (`activado` pasa a `true`), en vez de compararla contra una existente. De ahí en adelante el login es el de siempre (`bcrypt.compare`). Esto es la implementación real del "estudiante debe tener lista fija" que quedaba pendiente — ya no es un array hardcodeado, es una fila en `usuarios` con `activado=false`.

**Carga masiva por Excel (Sesión 20):** en la misma página, sección "Carga Masiva por Excel" — botón descarga plantilla `.xlsx` (columnas Nombres/Apellidos/Email, generada client-side con `xlsx`/SheetJS), input de archivo parsea el `.xlsx` subido en el navegador (`XLSX.read` + `sheet_to_json`, columnas detectadas sin importar mayúsculas) y llama `POST /api/estudiantes/bulk` con `dryRun:true` → tabla de vista previa con estado por fila (✅ OK / ❌ motivo: campos faltantes, email inválido, duplicado en el archivo, o ya existente en `usuarios`). Nada se guarda hasta pulsar "Confirmar y Crear", que reenvía solo las filas válidas con `dryRun:false` — mismo endpoint hace el insert real (misma lógica de placeholder `password_hash` + `activado=false` que el alta individual). El alta uno-por-uno original no cambió, es una sección aparte en la misma página.

Investigación (hoy: Jhonny, German, Cristina, Johana) todavía no tiene ninguna función propia — la tarjeta "Gestionar Investigación" del Portal no tiene links, solo un texto "Próximamente" (se quitó el link a `/investigacion/espacios` porque no tenía nada real detrás; la página sigue en el código, sin enlazar).

**Gestión de Carrera** (`/gestion-carrera`) es aparte: cualquier docente (investigación o vinculación) registra ahí eventos generales de difusión, categorizados como Investigación (¿qué proyecto?) / Vinculación / Asignatura (texto libre) — no reemplaza el formulario simple de Difusión que ya usa el estudiante-instructor dentro de su espacio.

### Tablas Neon (esquema real, no siempre igual a `scripts/migrate.js` — hubo drift por cambios hechos fuera de git)
| Tabla | Para qué | Notas |
|---|---|---|
| `usuarios` | Personas del Portal (todos los roles) | Fuente de verdad de "quién es quién" en el sistema nuevo |
| `perfiles_estudiantes` / `perfiles_beneficiarios` | Datos extra según rol | perfiles_estudiantes: carrera/modalidad. perfiles_beneficiarios (Sesión 21): contacto, edad, tiene_discapacidad/tipo_discapacidad, situacion_ocupacional (solo_estudia\|estudia_trabaja\|solo_trabaja\|desempleado_no_estudia) + condicionales rol_laboral / nivel_educativo (universidad\|colegio\|escuela) / carrera / curso — reemplaza la antigua columna situacion_laboral (texto libre) |
| `espacios_enseñanza` | Clubes/aulas/cohortes | Columna `area`: `vinculacion`\|`investigacion` |
| `espacio_instructores` | Qué estudiante es instructor de qué espacio | Base del control de acceso por espacio |
| `inscripciones_espacio` | Beneficiarios asignados a un espacio | |
| `ciclos_academicos` | Semestres | Compartido entre áreas, no se etiqueta |
| `evaluaciones_mcer` | Resultados del test MCER | `beneficiario_id` es **entero** → `usuarios.id` (se corrigió en Sesión 19, antes era UUID roto contra la tabla vieja `beneficiarios`) |
| `encuestas_satisfaccion` | Encuestas de satisfacción | |
| `actividades_difusion` | Eventos/podcasts (Difusión + Gestión de Carrera) | `categoria`/`proyecto`/`asignatura`/`descripcion`/`hora`/`observaciones` + `profesores_responsables integer[]` (Sesión 23, ver abajo) |
| `asistencia_espacio` / `asistencia_beneficiarios` | Bitácora de asistencia por espacio | Reemplaza el módulo viejo `bitacora_asistencia` (UUID) |
| `calificaciones_ciclo` | ⚠️ **Sin usar** | Feature "Calificaciones" del panel docente se eliminó (Sesión 19, decisión del usuario: el test MCER es la única evaluación real). Tabla queda huérfana, no se borró. |
| `Contribution` / `ContributionAuthor` | Contribuciones académicas de docentes (artículos, libros, capítulos, memorias de evento, propiedad intelectual) | **Nombres con mayúscula, sin snake_case** — a diferencia de todo el resto del esquema, porque se manejan vía Prisma (`prisma/schema.prisma`) sin `@@map`, no SQL crudo. Creadas a mano en Sesión 24 con `scripts/migrate-contribuciones.js` (no con `prisma db push`, ver advertencia en `## Stack Técnico`). Visibilidad: `GET`/`DELETE /api/contribuciones` solo `modulos_acceso: admin`; `POST` cualquier docente (`rol: profesor\|admin`) autenticado. |

**⚠️ Esquema viejo, huérfano, NO tocar sin decisión explícita:** `estudiantes`, `espacios`, `beneficiarios`, `bitacora_asistencia`, `bitacora_estudiantes`, `bitacora_beneficiarios` — todas UUID, del módulo de asistencia original (pre-Sesión-19). Tenían 3 cuentas reales (Andy Castillo, Josselyn Mera, Ailys Bailón) que quedaron huérfanas — deben autoregistrarse de nuevo en `/registro`, sus claves viejas no eran recuperables.

**⚠️ Tablas sin usar en ningún lado del código, creadas fuera de git (probablemente por Antigravity vía consola de Neon), sin confirmar con el usuario:** `avance_investigacion`, `seguimiento_laboral`, `eventos_difusion`, `eventos_estudiantes`, `encuesta_satisfaccion` (singular, distinta de `encuestas_satisfaccion`). Apuntan al esquema UUID viejo. **No construir nada sobre ellas sin antes preguntar** — probablemente son la base pensada para expandir Investigación/Vinculación, pero no hay contexto documentado de su diseño.

### Variables de entorno requeridas (Neon/Portal)
`DATABASE_URL` (Neon), `SESSION_SECRET` (firma de `pine_app_session`), `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` (uploads). Todas ya están en Vercel Production — ver `.env.local.example` para desarrollo local.

### Módulo `/utilidades` — generación de documentos administrativos (Sesión 27)

Generador de documentos `.docx` para trámites de la carrera, integrado dentro de `app/utilidades/` (venía de un proyecto standalone "Utilidades" — la carpeta portable original `carrera-herramientas/` se eliminó en esta sesión, ya no se usa). 5 herramientas: **Acta Técnica**, **Oficios**, **Convocatorias** (a docentes o a estudiantes vía Excel), **PATs Maestría** (paquete PAT-003 a PAT-006), **Pares Lectores** (evaluación de trabajos de titulación). Todas con redacción asistida por IA (Groq) para los campos de texto libre.

- **Selector de docentes (Acta Técnica, Oficios, Convocatorias a docentes):** hasta esta sesión leían de una tabla `docentes` separada de `usuarios` — que además **nunca llegó a crearse en la Neon de producción real** (el fetch fallaba silenciosamente con "relation docentes does not exist", el frontend caía a un array vacío, y nadie lo notó porque el modo manual siempre estaba disponible). Se unificó: en vez de crear esa tabla huérfana, `usuarios` ganó columnas opcionales `titulo_grado`/`post_grado`/`cargo_institucional`/`es_director`/`dependencia` (`scripts/migrate-usuarios-docentes.js`). Una fila de `usuarios` aparece en estos selectores cuando `titulo_grado IS NOT NULL`, sin importar su `rol` de auth — `app/utilidades/_lib/docentes.ts` es la única fuente (`getAllDocentes`/`getDocentesByCarrera`/`getAllCarreras`), consumida sin cambios por Convocatorias/Oficios y ahora también por Acta Técnica (antes 100% texto libre manual).
- **Dos tipos de fila en `usuarios` para este directorio:** (a) docentes reales de PINE con `rol='profesor'`, `activado=false` — se activan solos con su email real en su primer login (idéntico al alta de pasantes); (b) autoridades externas que **nunca** inician sesión (Decano, Rectora Subrogante, Director DIPSB) con `rol=NULL` (columna ya nullable, no se tocó el CHECK) y `activado=false` permanente, invisibles para todo el middleware/auth — mismo patrón de email placeholder que `beneficiarios`.
- **14 personas sembradas** (Sesión 27, todas confirmadas explícitamente por el usuario): Arturo Rodríguez, Jhonny Villafuerte, Cintya Zambrano (ya eran usuario real); María Cristina Basantes Robalino, Gabriel Bazurto Alcívar, Laura Mena Sánchez, Ulbio Farfán Corrales (unifica lo que en un seed viejo nunca aplicado aparecían como dos personas distintas, "Gonzalo" y "Ulbio" Farfán), Jorge Corral Joniaux, Germán Carrera Moreno (Coordinador de Carrera — no "Director", corregido en esta sesión), Verónica Chávez Zambrano (Responsable de Comisión Académica), Yasmín Bermúdez Velasco (Secretaria de Carrera — no es docente, pero firma/participa en los mismos documentos de `/utilidades`) — pre-alta pendiente de activación; Jackeline Terranova Ruiz (Rectora Subrogante — actualizado en esta sesión, antes decía Vicerrectora Académica), Klever Alfredo Delgado Reyes (Director DIPSB), Pedro Quijije Anchundia (Decano, Facultad de Educación y Turismo) — autoridades externas sin cuenta real.
- **Otras tablas del módulo** (no tocadas en esta unificación, siguen igual): `modalidades_titulacion`, `rubricas`, `evaluaciones`, `evaluacion_observaciones`, `evaluacion_indicadores` (Pares Lectores) — creadas por `scripts/migrate-utilidades.js`, que ya NO crea/siembra `docentes`.
- **Auditoría de las 5 herramientas (Sesión 27, a pedido del usuario) — 3 hallazgos reales corregidos:**
  1. ⚠️ **Ninguna de las 20 API routes de `/utilidades` verificaba sesión** — `middleware.ts` protege las páginas pero su `matcher` excluye `/api` explícitamente (necesario para las APIs públicas del sitio, ej. `/api/members`), y ninguna ruta de `/utilidades/**/api/**` hacía el chequeo por su cuenta (a diferencia de `/api/beneficiarios`, `/api/estudiantes`, etc., que sí llaman `getAppSessionFromCookies()` dentro del handler). Cualquiera sin sesión podía generar documentos institucionales o leer/modificar evaluaciones de Pares Lectores solo conociendo la URL. Corregido con un helper nuevo (`app/utilidades/_lib/auth.ts:requireDocenteApi()`, mismo criterio que el middleware: `rol` profesor o admin) agregado a las 20 rutas.
  2. El "Tutor" que firma PAT-006 (PATs Maestría) estaba **hardcodeado a "Dr. Rodríguez Zambrano Arturo Damián, PhD"** sin importar qué maestría/responsable se hubiera seleccionado — las 3 maestrías tienen responsables distintos ya calculados en `datos.responsable` (Vanessa Vargas Parraga, Diana Delgado Mero, Gabriel Bazurto Alcívar). Corregido en `_lib/patMaestria.ts`.
  3. Pares Lectores: el campo "evaluador/a" (quien hace la evaluación) no se autocompletaba con el usuario logueado — mismo patrón de autoselección que ya se agregó a Firmante/Convocante/Elaborado por, aplicado aquí también.

---

## Estado Actual (2026-09-02, Sesión 26)

| Módulo | Estado | % |
|--------|--------|---|
| Sitio público (landing + páginas de proyecto) | ✅ Completo — contenido en Neon Postgres (migrado desde `lib/data.ts` estático, Sesión 25), footer/equipo/hub/RED LEA contextuales por proyecto, i18n ES/EN completo (Sesión 26) | 100% |
| Admin Panel (CRUD contenido del sitio) | ✅ Completo — gateado por `modulos_acceso: contenido_sitio` (solo Arturo+Jhonny), ya no por `Pine2026` ni por `admin` genérico. Persiste en Neon (ya no "legacy"/in-memory) | 100% |
| Portal PINE — Auth unificada | ✅ Completo (Sesión 19) | 100% |
| Portal PINE — Vinculación (espacios/instructores/beneficiarios/MCER/encuesta/asistencia) | ✅ Completo, probado end-to-end en producción (Sesión 19) | 100% |
| Portal PINE — Investigación | ⏳ Solo creación de espacios; artículos científicos pendiente de definir | 30% |
| Gestión de Carrera (eventos multi-área) | ✅ Completo (Sesión 19) | 100% |
| Contribuciones Académicas | ✅ Reparado y funcional (Sesión 24) — ⏳ solo campos comunes, faltan ~15 campos específicos por tipo, exportación CSV y tests (ver plan original) | 60% |
| Módulo `/utilidades` (Acta Técnica/Oficios/Convocatorias/PAT-Maestría/Pares Lectores) | ✅ Selector de docentes unificado en `usuarios` con las 13 personas del directorio confirmadas por el usuario, funcional en las 3 herramientas que lo usan (Sesión 27) | 100% |
| Deploy Vercel | ✅ Auto-deploy activo en push a `main` | 100% |

**Progreso general del sitio público: ~99%. Portal PINE (Neon): recién construido, en uso real solo por Arturo hasta que el resto del equipo se autoregistre.**

---

## Cambios Recientes (Sesión 27 — 2026-09-02)

### Módulo /utilidades conectado a la BD real + unificación de tablas de docentes

A pedido explícito del usuario ("las herramientas de utilidades no permiten traer a los docentes de la base de datos"). Auditoría en vivo contra la Neon de producción real (vía Neon MCP, antes de tocar nada) reveló que la causa no era solo de UI:

1. **Hallazgo:** la tabla `docentes` (fuente de Convocatorias y Oficios) **nunca se creó en producción** — el script que la crea/siembra (`scripts/migrate-utilidades.js`) nunca se corrió contra el `DATABASE_URL` real. El selector de docentes en esas dos herramientas estaba silenciosamente vacío desde siempre (el `fetch` fallaba, el frontend caía a `catch(() => [])`).
2. **Unificación (en vez de crear la tabla huérfana):** se agregaron columnas opcionales a `usuarios` (`titulo_grado`, `post_grado`, `cargo_institucional`, `es_director`, `dependencia` — `scripts/migrate-usuarios-docentes.js`). Ya no hay dos catálogos de "quién es docente" — uno de ellos ni siquiera existía. Ver detalle en `## Portal PINE` → `### Módulo /utilidades`.
3. **Acta Técnica** ganó selector de docentes (convocante, cada participante, elaborado por) — antes 100% texto libre manual, a diferencia de Convocatorias/Oficios que ya lo tenían (aunque roto por el punto 1).
4. **13 personas confirmadas por el usuario y sembradas** — incluyendo 2 correcciones sobre el seed original (nunca aplicado) de `docentes`: "María Basantes" era en realidad María Cristina Basantes Robalino; "Gonzalo Farfán" y "Ulbio Farfán" eran la misma persona (nombre real: Ulbio). Cargos actualizados: Germán Carrera es **Coordinador de Carrera** (no "Director"), Verónica Chávez es **Responsable de Comisión Académica**, Jackeline Terranova es actualmente **Rectora Subrogante** (no Vicerrectora Académica).
5. **Carpeta `carrera-herramientas/` eliminada** — era la versión "portable" original desde donde se integró todo esto a `app/utilidades/`, ya no se usaba ni se referenciaba en producción.

Rama: `claude/utilidades-seleccionar-docentes-wmpzfo`.

---

## Cambios Recientes (Sesión 26 — 2026-09-02)

### Navegación del panel + footer contextual + equipo filtrado por proyecto

Sesión de reparación y coherencia de contenido a pedido explícito del usuario, en 3 partes:

1. **Navegación del Portal sin pérdida de sesión.** `/api/auth/portal-login` y `/portal/login` ahora respetan un parámetro `redirect` para volver a la página de origen tras el login (antes forzaba siempre a `/portal/dashboard`); corregidos 13 redirects rotos que apuntaban a `/login?redirect=` en vez de `/portal/login?redirect=`; agregado botón "Volver al Portal PINE" en `/contribuciones` y en el top bar de `/admin` (antes no había forma de retroceder al portal sin cerrar sesión).
2. **Footer contextual por proyecto/sección.** Antes el footer mostraba siempre a Arturo+Jhonny como contacto y los mismos 5 "Enlaces Rápidos" (`#inicio`/`#equipo`/`#videos`/`#publicaciones`/`#noticias`) en las 10 páginas que lo usan — esos anchors solo existen realmente en `/investigacion/proyecto-innovacion`. `lib/data.ts:footerContexts` (nuevo) define, por contexto, `leader`/`coleader`/`contactEmail` y `quickLinks` reales de esa página; `Footer` ahora acepta `context` como prop. Contextos: `default` (Internacionalización, Arturo+Jhonny), `landing` (solo `c.pinextranjeros@uleam.edu.ec`), `vinculacion` (Cynthia), `linguistica` (German+Cristina), `mentoring` (Verónica), `docencia` (Verónica), `redlea` (Jhonny, coordinador — anchors propios `#sobre`/`#testimonios`/`#galeria`/`#memoria`), y `general` (páginas standalone del sitio principal sin secciones propias: publicaciones, boletines, portal/login, portal/dashboard — mantienen a Arturo+Jhonny pero con navegación real en vez de anchors rotos).
3. **Equipo (`TeamSection`) filtrado por proyecto.** `members.projects` (`text[]`, nueva columna vía `scripts/migrate-members-projects.js`) reemplaza el listado único sin distinción — antes German y Cynthia (líderes de proyecto propio) aparecían también en el equipo de Internacionalización. `GET /api/members?project=X` filtra; `TeamSection` acepta prop `project`; cada página de proyecto la pasa. German → sale de Internacionalización, queda solo en `/investigacion/desarrollo-habilidades`. Cynthia → sale de Internacionalización, queda solo en `/vinculacion/dinamicas-linguisticas` (ahí se le agregó `TeamSection`, no la tenía). Cristina Basantes es la única excepción con dos proyectos (confirmado explícitamente por el usuario): colídera de Desarrollo de Habilidades + colaboradora de Internacionalización (Podcast). Panel `/admin/members` actualizado con checkboxes para editar `projects`.
4. **Página nueva: `/investigacion/mentoring` (Verónica Chávez).** No existía ninguna landing para el 4to proyecto propio del grupo — Verónica ni siquiera estaba en la tabla `members` (solo en `profesoresAutorizados`/`profesorModulos`/`liderProyectoPropio`). Creada siguiendo el patrón de `desarrollo-habilidades` (`ProjectHero`+`ProjectIntegrationNote`+`TeamSection`+`Contact`, `Footer context="mentoring"`), agregada al dropdown "Investigación" del Header, entrada `mentoringProject` en `lib/i18n.tsx` (ES+EN). Verónica agregada a `members` como `member_12` — **sin foto todavía** (placeholder, pendiente subir imagen real a `public/images/`). Ver advertencia en `## Equipo actual` para no confundir con el `member_12` fabricado que existió en Sesión 19.
5. **Nombres oficiales completos visibles en el Hero de cada proyecto** (antes solo documentados en este CLAUDE.md, no mostrados en el sitio) — `heroDescription` actualizado en `lib/i18n.tsx` para Internacionalización, Desarrollo de Habilidades y el nuevo Mentoring con el texto exacto de `### Proyectos del grupo — nombres oficiales`. Dinámicas Lingüísticas (Cynthia) no necesitó cambio, su nombre corto ya es el oficial.
6. **Bloque "About" del footer también contextual.** El título+descripción fijos ("Innovaciones Pedagógicas e Internacionalización" + su descripción) que mostraba el footer en las 10 páginas quedó igual de hardcodeado que el resto hasta este punto — `FooterContext` ahora incluye `title`/`description` por contexto, reutilizando el `heroDescription` de cada proyecto donde existe.
7. **Formulario "Envíanos un mensaje" apunta al correo institucional.** `components/Contact.tsx:CONTACT_EMAIL` estaba fijo a `arturo.rodriguez@uleam.edu.ec` para el envío por Gmail/Outlook en las 5 páginas de proyecto que usan este formulario — corregido a `c.pinextranjeros@uleam.edu.ec`.
8. **Alianzas/Noticias/Actividades exportadas de Internacionalización a la página principal (`/`).** Eran contenido general de la carrera (alianzas institucionales, noticias, galería de actividades — ninguno filtrado por proyecto en su fetch) mal ubicado bajo el proyecto de Internacionalización específicamente. `ConnectionsSection` ("Alianzas y Apoyo") ahora acepta prop `compact` (logos más chicos, sin texto descriptivo) usada en `/`; `ActivityGallery` acepta prop `limit`; `NewsSection` se movió tal cual, sin cambios de props. Los 3 componentes se quitaron de `/investigacion/proyecto-innovacion` y se agregaron a `app/page.tsx`.
9. **Galería de Actividades reubicada de nuevo, esta vez a Docencia Innovadora.** El paso 8 la había puesto en `/` con `limit={8}`, pero el usuario pidió moverla a `/docencia/docencia-innovadora` (mejor encaje: son fotos de aula/cátedra, no contenido general de la carrera) — ahí queda sin límite. `footerContexts.landing.quickLinks` perdió el anchor `#actividades`; `footerContexts.docencia` pasó de compartir `projectPageQuickLinks` a tener su propio array con `#actividades`.
10. **Hub principal (`HubProjectsSection`) reducido a solo Boletines.** Tenía 3 tarjetas (PINE/Grupo de Investigación, RED LEA, Boletines) — las primeras 2 se quitaron por ser redundantes con el dropdown "Investigación" del Header (ya accesibles ahí). La tarjeta de Boletines usaba el mismo label `t.hub.groupName` ("Grupo de Investigación") que la de PINE — incorrecto, los boletines son de la Carrera. Nueva key `t.hub.careerLabel` ("Carrera") usada en su lugar.
11. **Ajustes en la página de Vinculación, a pedido explícito del usuario:** `VinculacionResearchSection` ya no muestra la noticia de capacitación (`news_10`) junto al libro — solo queda el libro (`pub_3`). Arturo Rodríguez pasa de "Colíder del Proyecto" a **"Supervisor"** en el formulario de contacto (`Contact.tsx`, nueva key `t.contact.supervisor`) — Cynthia es la única líder ahí. Arturo también se agregó al **Equipo** de Vinculación (`members.projects` de `member_1` ahora incluye `'vinculacion'` además de `'internacionalizacion'`) con el mismo badge "Supervisor" — `TeamSection`/`TeamCard` ganaron `ROLE_BADGE_OVERRIDES` (por proyecto + member_id) para estos casos de alguien con rol distinto según la página donde aparece.
12. **Subtítulo del equipo contextual.** "Investigadores dedicados a transformar la educación" estaba fijo en `TeamSection` para las 4 páginas de proyecto — incorrecto en Vinculación (no es un equipo de investigadores). `t.team.subtitles` por proyecto.
13. **Crédito de desarrollador en el footer, en las 10 páginas.** La línea de copyright ya no dice "Innovaciones Pedagógicas" (era específico de ese proyecto); debajo, muy sutil (`text-xs`, gris apagado), dice "Desarrollador responsable de la web: Arturo Rodríguez".
14. **Nombre de la carrera consistente en el Header de todas las páginas.** El texto junto al logo (enlaza siempre a `/`) decía "Innovaciones Pedagógicas - ULEAM" por defecto en las páginas que no pasaban `siteName` explícito — nombre del proyecto de Internacionalización, no de la carrera. Unificado a **"Pedagogía de los Idiomas Nacionales y Extranjeros"** (`t.nav.siteName`) como default de `Header.tsx`; landing y boletines ya no pasan su propio `siteName` custom.
15. **Auditoría e internacionalización completa ES/EN.** El toggle EN/ES del Header cambiaba el estado de idioma correctamente, pero la mayoría del contenido nunca pasaba por `t.xxx` — 6 componentes con **cero** soporte i18n (los 5 de RED LEA + `SubstantiveFunctionsSection`, más `QRModal`/`QRFloatingButton`/`VideoCard`), y ~11 componentes más con texto **mixto** (`TeamSection`, `ActivityGallery`, `NewsSection`, `Contact`, `PublicationsSection`, `VideoGallery`, `TaggedVideoSection`, `Header`), más los bloques "Información del Proyecto" hardcodeados directo en `app/investigacion/desarrollo-habilidades/page.tsx` y `.../mentoring/page.tsx` (movidos a nuevo componente cliente `components/ProjectInfoPlaceholder.tsx`, ya que esas páginas son Server Components sin acceso a `useLanguage()`). Todo el contenido institucional extenso de RED LEA (bio, testimonios de 6 personas, logros, proyecciones) se trasladó a `lib/i18n.tsx` bajo `t.redlea.*` con traducción real al inglés. Fechas que usaban `toLocaleDateString('es-EC', ...)` fijo ahora usan `es-EC`/`en-US` según el idioma activo (`VideoCard`, `NewsSection`, `PublicationsSection`). `ConnectionsSection`, `HubProjectsSection`, `About`, `EnglishClubSection` y `VinculacionResearchSection` ya estaban completos, confirmado por auditoría. Único texto en español que queda fijo fuera del panel admin: captions de fotos en datos (`vinculacionEnglishClubPhotos`, `member.role`) — contenido real, no copy de interfaz.

16. **Fix: `/docencia/docencia-innovadora` mostraba a Arturo+Jhonny en el formulario de contacto.** Al mover `ActivityGallery`+`Contact` a esta página (punto 9) quedó `<Contact />` sin `projectKey` — cae al branch por defecto de `Contact.tsx` (Arturo líder/Jhonny colíder, el mismo que usa la página de Internacionalización), incorrecto para Docencia. Agregado `projectKey="docenciaProject"` con un solo contacto: Verónica Chávez, rol **"Responsable de Comisión Académica"** (nueva key `t.contact.comisionAcademica`, ES/EN) — no "líder"/"colíder", su rol acá es distinto al de Mentoring.
17. **Orden del equipo por proyecto, no solo global.** `members.order` es una sola columna global (define el orden en Internacionalización) — pero en Vinculación debía ir Cynthia (líder) antes que Arturo (supervisor), y en Lingüística German (líder) antes que Cristina (colídera), al revés de su `order` global. Columna nueva `members.project_order` (JSONB, ej. `{"vinculacion": 2}`) vía `scripts/migrate-members-project-order.js` — `GET /api/members?project=X` ahora ordena por `COALESCE((project_order->>project)::int, "order")`. De paso, `TeamSection.ROLE_BADGE_OVERRIDES` ganó `desarrollo_habilidades: { member_3: 'coleader' }` — Cristina aparecía con badge "Participante" en la página de Lingüística (fallback por defecto), cuando ahí es colídera; en Internacionalización sigue con su badge normal (sí es solo participante ahí).

Migración Neon de `members.projects` (punto 3): ejecutada directamente por Claude vía MCP de Neon (Project ID `dark-feather-21824720`, obtenido del usuario) en esta misma sesión — no fue necesario que el usuario corriera el script localmente. `scripts/migrate-members-projects.js` queda como referencia idéntica al cambio ya aplicado en producción.

---

## Cambios Recientes (Sesión 25 — 2026-09-02)

### Migración de `lib/data.ts` (estático) a Neon Postgres — completa

Objetivo a corto plazo del usuario: eliminar la base de datos estática del sitio público (`lib/data.ts` + `lib/db.ts`, que **no persiste** — cualquier edición desde `/admin/*` se pierde en el próximo redeploy, confirmado en el propio comentario del archivo) y migrar cada entidad a Neon, igual que el resto del Portal (SQL crudo, sin Prisma). Plan completo (schema de las 4 entidades restantes, decisiones de diseño, orden) en el plan file de la sesión — no versionado en el repo, pedir al usuario si hace falta retomarlo en detalle. Progreso:

- ✅ **`members`** (piloto) — tabla creada y sembrada (11 filas, mismos ids `member_1`...`member_11`), `app/api/members/route.ts` + `[id]/route.ts` (GET público, POST/PATCH/DELETE protegidos por `modulos_acceso: contenido_sitio`), `TeamSection.tsx` y `/admin/members` reconectados a `fetch()`. `lib/db.ts`/`lib/data.ts` ya no se usan para members (quedan las funciones ahí sin llamar, se limpian al final de la migración completa).
- ✅ **`video_categories` + `videos`** (rebautizado **"Podcast"** en toda la UI admin — nav, dashboard, títulos de formulario) — mismo patrón, `app/api/video-categories/` + `app/api/videos/` (el segundo con `LEFT JOIN video_categories` replicando el `expand.category` que hacía `lib/db.ts` a mano). **Cambio de comportamiento pedido por el usuario:** `youtube_url`/`embed_id`/`published_date` pasan de `NOT NULL` a opcionales — un episodio de podcast se puede registrar solo con metadata (título/descripción/categoría) y completar el link de YouTube después, editando. `VideoCard.tsx` y `types/index.ts:Video` actualizados para tolerar esos campos nulos (muestra "Próximamente" si no hay `embed_id`). Probado extremo a extremo local: crear sin link → editar agregando link → `embed_id` se deriva correctamente.
- ✅ **`actividades_difusion` extendida** — fusión de News (9) + Activities (14) del sitio estático **con** la tabla ya-en-producción `actividades_difusion` de Vinculación/Gestión de Carrera (`/vinculacion/difusion`, `/gestion-carrera`) — decisión explícita del usuario, ampliada en una segunda vuelta de esta misma sesión (primero pidió fusionar solo News+Activities, después "actividades y actividades de difusión deberían unirse"). `ALTER TABLE` aditivo puro (no tocó columnas existentes usadas por los flujos ya en producción): `legacy_id` (preserva `news_X`/`activity_X`), `origen` (`'noticia'|'actividad'|'difusion'`, discriminador), `slug`, `external_link`, `project_id`, `photos[]`, `is_featured`, `"order"`, y el **gate de aprobación** `aprobado_sitio`/`aprobado_por`/`fecha_aprobacion`. Regla: lo que registra un docente/estudiante vía `/api/difusion` nace con `aprobado_sitio=false` (no cambia esa ruta, los defaults de columna lo cubren) y **no sale en la web pública** hasta que alguien con `modulos_acceso:contenido_sitio` lo aprueba desde `/admin/activities` (ahora "Actividades y Difusión", cola de moderación); lo que crea `contenido_sitio` directo (`POST /api/actividades-difusion`) nace ya aprobado. `app/api/actividades-difusion/route.ts` (GET público solo `aprobado_sitio=true`, admite `?origen=`; GET `?pendientes=true` protegido) + `[id]/route.ts` (PATCH aprobar/editar, DELETE). `/admin/news` reescrito para crear noticias directo en la misma tabla (`origen='noticia'`). Componentes públicos reconectados: `NewsSection.tsx`, `ActivityGallery.tsx`, `SubstantiveFunctionsSection.tsx`, `VinculacionResearchSection.tsx` (el lookup hardcodeado `news_10` ahora busca por `legacy_id`, no por PK), y `lib/db.ts:getNewsletters()` (usado por `/boletines`) repuntado a la nueva tabla. Probado extremo a extremo local: registrar difusión → no aparece en público → aparece en cola de pendientes → aprobar → sí aparece en público.
- ✅ **`publications`** (última entidad — **migración completa, las 4 hechas**) — antes de migrar se hizo auditoría de contenido cruzando las 19 publicaciones estáticas contra los 9 artículos + 3 libros ya cargados en `Contribution` esta sesión (con DOI verificado vía Crossref): salieron **7 duplicados con título/fecha desactualizados** en el estático (se corrigieron con el dato real del DOI — ej. pub_62 tenía fecha 2026-04-01, la real es 2026-07-01; pub_61 tenía un título de borrador, el publicado es distinto) y **2 artículos publicados que faltaban por completo** (TEACCH, Communicative Challenges) — se agregaron como `pub_77`/`pub_78`. Las 6 publicaciones de 2025 y las 3 de 2026 restantes sin contraparte en Contribution se migraron tal cual (sin evidencia concreta de error, no había nada puntual que corregir). Total: 21 filas. `app/api/publications/route.ts` + `[id]/route.ts`, mismo patrón que el resto. `PublicationsSection.tsx`, `app/publicaciones/page.tsx`, `/admin/publications`, `SubstantiveFunctionsSection.tsx` y `VinculacionResearchSection.tsx` (lookup `pub_3` ahora vía `GET /api/publications/pub_3`) reconectados.
- ✅ **Limpieza final del código estático.** Antes de borrar, auditoría exhaustiva en 2 agentes en paralelo (búsqueda a ciegas en todo el repo, no solo en lo tocado esta sesión): confirmado que **cero** componentes/páginas seguían importando las 6 arrays o las funciones CRUD de `lib/db.ts` asociadas; que **no existe** `sitemap.ts`/`robots.ts`/`generateMetadata`/`generateStaticParams`/JSON-LD en todo el repo (cero riesgo de build-time/SSG dependiendo de las arrays); y que las únicas referencias vivas a `@/lib/data`/`@/lib/db` eran los exports fuera de alcance. Con eso confirmado, se borraron de `lib/data.ts` los 6 arrays (`members`, `publications`, `videoCategories`, `videos`, `news`, `activities`) y de `lib/db.ts` sus 6 bloques CRUD — quedan `siteSettings`+su CRUD (fuera de alcance, no migrado), `getNewsletters` (ya reescrita para leer de Neon), y en `lib/data.ts` solo `siteSettings`, `profesoresAutorizados`, `profesorModulos`, `liderProyectoPropio`, `vinculacionEnglishClubPhotos`. `npx tsc --noEmit` y `npm run build` limpios después del borrado; smoke test contra `npm run dev` en `/`, `/publicaciones`, `/boletines`, `/vinculacion/dinamicas-linguisticas`, `/admin/dashboard` — todas responden bien (200/307-login esperado), ninguna crashea.
- Scripts de migración: `scripts/migrate-members.js`, `scripts/migrate-videos.js`, `scripts/migrate-actividades-difusion-extend.js` + `scripts/seed-news-activities-legacy.js`, `scripts/migrate-publications.js`.
- Todo probado con el patrón de "flujo real" ya establecido (`scripts/_lib-sign-session.mjs` — cookie de sesión firmada localmente, coincide con el `SESSION_SECRET` de producción) contra `npm run dev` local antes de dar por buena cada entidad.

## Cambios Recientes (Sesión 24 — 2026-09-01)

### Módulo Contribuciones Académicas: implementación previa estaba rota de punta a punta, reparada

Antigravity había construido el módulo siguiendo `implementation_plan_es.md` (commits `f432452`/`09fb41a`/`57b31d6`), pero **nunca llegó a producción** ni funcionaba localmente. Auditoría (a pedido del usuario, "verifica que se implementaron los cambios en Vercel") encontró 6 problemas independientes:

1. **Build roto en Vercel — 3 deploys seguidos en `ERROR`.** El wizard (`app/contribuciones/new/[type]/page.tsx`) y la API (`app/api/contribuciones/route.ts`) importan `react-hook-form`, `yup`, `@hookform/resolvers` y `zod`, ninguno estaba en `package.json`. Producción seguía sirviendo el commit anterior a todo esto (`c96a370`) — el módulo nunca estuvo visible para nadie.
2. **Auth de la API nunca conectada.** `GET`/`POST`/`DELETE /api/contribuciones` leían el rol de `request.headers.get('x-user-role')`, header que nada seteaba: `app/api/_middleware.ts` (el que lo intentaba) es **código muerto** — Next 14 App Router no soporta `_middleware.ts` por carpeta (convención de Pages Router, removida) — y el `middleware.ts` raíz real excluye `/api` de su `matcher`. Resultado: `GET`/`DELETE` siempre 403, `POST` siempre 401, para cualquiera incluido el admin real. Reescrito para usar `getAppSessionFromCookies()` (mismo patrón que `api/difusion/route.ts` y el resto del Portal).
3. **Página `/contribuciones` sin control de acceso.** No estaba en `protectedRoutes` de `middleware.ts` ni tenía chequeo client-side — cualquiera podía cargarla pese a que el plan pedía "solo admin". Agregada a `middleware.ts`: `/contribuciones` (listado) exige `modulos_acceso: admin`, `/contribuciones/new*` (wizard) exige sesión con `rol: profesor\|admin`.
4. **Tablas `Contribution`/`ContributionAuthor` nunca migradas a Neon.** No existía `prisma/migrations/`. Al intentar `prisma db push` para crearlas: Prisma comparó el schema (que solo modela estas 2 tablas) contra **toda** la base y pidió confirmación para **borrar 9 tablas con datos reales** (`usuarios`, `estudiantes`, `espacios`, etc. — no están en `schema.prisma`). Abortado sin `--accept-data-loss`. Tablas creadas a mano con SQL crudo (`scripts/migrate-contribuciones.js`, mismo patrón que el resto de `scripts/migrate-*.js`) — **ver advertencia permanente en `## Stack Técnico`: no volver a intentar `prisma db push`/`migrate` en este proyecto.**
5. **Prisma 7 no compila con el schema tal como está.** `package.json` traía `prisma@^8.0.0-rc.12` + `@prisma/client@^7.10.0` (versiones ni siquiera entre sí compatibles). Prisma 7 removió el datasource clásico `url = env("DATABASE_URL")` (exige `prisma.config.ts` + driver adapters). Downgrade a `^6.19.3` en ambos paquetes — compila igual que el schema original sin reescribir nada. `@prisma/client` movido de `devDependencies` a `dependencies` (se usa en runtime); agregado `"postinstall": "prisma generate"` a `package.json` (si no, Vercel no genera el client).
6. **Wizard con bug de runtime + paso 1 del flujo faltante.** `addAuthor()` llamaba `control.append(...)`, método que no existe en `control` de react-hook-form (es de `useFieldArray`) — el botón "Añadir autor" tiraba `TypeError` en cuanto se clickeaba. Corregido con `useFieldArray`. Además el input de orden de autor no coercionaba a número (`valueAsNumber: true`, si no yup lo rechazaba por ser string). El plan pedía un Paso 1 "Selección de tipo (tarjetas)" antes del formulario — nunca se construyó `app/contribuciones/new/page.tsx`, así que no había ninguna forma de llegar al wizard (`/contribuciones/new/[type]` no tenía ningún link apuntándole). Creada esa página (6 tarjetas, una por tipo de contribución) + tarjeta nueva "Contribuciones Académicas" en `/portal/dashboard` (visible a todo docente, con link extra al listado solo si `modulos_acceso` incluye `admin`) — sin esto el feature seguía siendo inalcanzable aunque todo lo demás funcionara.

Verificado tras los fixes: `npx tsc --noEmit` limpio, `npm run build` genera las 3 rutas nuevas (`/contribuciones`, `/contribuciones/new`, `/contribuciones/new/[type]`, `/api/contribuciones`) sin error. Pendiente de este mismo turno: commit + push (deploy automático a Vercel vía hook).

⚠️ **Alcance no cubierto en esta sesión, no confundir con "ya está completo":** el wizard solo captura los campos comunes (título, línea de investigación, fecha, campo detallado, estado, autores) — los ~15 campos específicos por tipo que detalla `implementation_plan_es.md` (ISSN/ISBN, cuartil, filiación, editor/compilador, país/ciudad del evento, etc.) no están en el formulario. Tampoco hay exportación CSV ni tests (Jest/Cypress) — ambos quedaron como "pendiente" en el plan original y siguen pendientes.

---

## Cambios Recientes (Sesión 23 — 2026-09-01)

- ✅ **Profesor(es) responsable(s) en eventos/podcasts.** Confirmado que estudiante (`/vinculacion/difusion`) y profesor (`/gestion-carrera`) escriben a la **misma tabla** `actividades_difusion` vía el **mismo endpoint** `POST /api/difusion` — solo cambia el formulario, no la fuente de datos. Antes solo se guardaba `registrador_id` (quien llena el form); no había forma de saber qué profesor(es) respaldan el evento.
  - Columna nueva `actividades_difusion.profesores_responsables INTEGER[]` (`scripts/migrate-responsables-difusion.js`, default `'{}'`) — array, no tabla puente, mismo patrón que `usuarios.modulos_acceso`. Soporta 1 o más responsables.
  - Endpoint nuevo `GET /api/profesores` → lista `{id, nombres, apellidos}` de `usuarios WHERE rol='profesor'`, para poblar el selector.
  - `POST /api/difusion` ahora exige `profesores_responsables` (mínimo 1) y valida contra Neon (`id = ANY(...) AND rol='profesor'`) antes de insertar — el responsable **siempre** se elige de la lista real, nunca texto libre.
  - UI: multi-select por checkboxes en ambos formularios (`/vinculacion/difusion` y `/gestion-carrera`). En `/gestion-carrera`, si quien registra es `profesor` se autoselecciona a sí mismo (editable, puede agregar co-responsables); en `/vinculacion/difusion` (estudiante) no hay autoselección, el estudiante-instructor no es profesor.
  - Podcast (`tipo='podcast'`) no tuvo tratamiento especial — hereda el campo automáticamente al pasar por el mismo form/tabla.

---

## Cambios Recientes (Sesión 22 — 2026-09-01)

- ⚠️ **Bug fix crítico:** `/registro` todavía ofrecía autoregistrarse como `beneficiario` y usaba la columna `perfiles_beneficiarios.situacion_laboral`, eliminada en la Sesión 21 — cualquiera que se registrara así habría recibido un error 500. Corregido eliminando la opción `beneficiario` de `PUBLIC_ROLES` en `app/api/auth/register/route.ts` (ahora solo `['profesor']`, consistente con "beneficiario nunca tiene cuenta" documentado desde Sesión 19) y simplificando `app/registro/page.tsx` (ya no hay selector de rol, es directamente registro de profesor). **Lección:** al hacer un cambio de esquema, buscar *todos* los endpoints que tocan esa tabla, no solo el que se está modificando — este caso no se detectó en la verificación de Sesión 21 porque solo se probó `POST /api/beneficiarios`, no `POST /api/auth/register`.
- ✅ `MANUAL_USUARIO.md` reescrito completo para reflejar Sesiones 19-21: tabla de "quién crea tu cuenta" por rol, Registros vs Gestión de Vinculación como tarjetas separadas, páginas planas de Registros (no tabs anidados en espacio), carga masiva de pasantes por Excel, campos extendidos de beneficiarios, asistencia con checks preseleccionados, nombres correctos de tarjetas del Portal ("Indicadores", "Gestión del Sitio").
- ✅ `ANTIGRAVITY.md` sincronizado con Sesiones 20-21 (ver más abajo).

---

## Cambios Recientes (Sesión 21 — 2026-08-31)

- ✅ **Datos extendidos de beneficiarios** (`/vinculacion/beneficiarios`, modo "Registrar nuevo"): agregados edad y discapacidad (checkbox + campo "¿cuál?"). Reemplazado el campo libre "Situación laboral" por un flujo condicional: select Situación ocupacional (solo estudia / estudia y trabaja / solo trabaja / desempleado y no estudia) → si trabaja pide rol; si estudia pide nivel educativo (universidad/colegio/escuela) → si es universidad pide carrera + curso. `perfiles_beneficiarios.situacion_laboral` (texto libre) eliminada de la tabla (estaba vacía en producción, sin riesgo de pérdida de datos) — ver `scripts/migrate-beneficiarios-perfil.js`. `POST /api/beneficiarios` actualizado para insertar las columnas nuevas.

---

## Cambios Recientes (Sesión 20 — 2026-08-31)

- ✅ **Carga masiva de pasantes por Excel** — nueva dependencia `xlsx` (SheetJS) `^0.18.5`. Endpoint nuevo `POST /api/estudiantes/bulk` (dos modos vía `dryRun`, ver detalle en `## Portal PINE` → sección Pasantes). UI en `/vinculacion/pasantes`: plantilla descargable + input de archivo + tabla de vista previa + confirmación. Alta uno-por-uno y CRUD existentes de esa página no se tocaron.
- ✅ Dashboard PINE (`/pine-dashboard`): las 4 tarjetas de KPI existentes agrupadas bajo `<h2>Vinculación</h2>` (preparado para sumar otras áreas a futuro).
- ✅ Portal (`/portal/dashboard`): tarjeta "Indicadores (Gerencia)" → "Indicadores".

---

## Cambios Recientes (Sesión 19 — 2026-08-30)

### Construcción completa del Portal PINE (Neon Postgres) + hardening de seguridad

Sesión larga, trabajo en paralelo con Antigravity en el mismo repo (varios push directos a `main` sin coordinación previa) — buena parte del trabajo fue reconciliar/corregir lo que Antigravity introdujo, no solo construir features nuevas. Ver `## Portal PINE` arriba para el estado final del sistema; aquí el resumen de lo que pasó:

- ✅ **Fix de seguridad crítico:** el panel `/admin` original usaba una cookie (`admin_session`) sin firmar, seteada por JS del cliente — cualquiera podía forjarla desde la consola del navegador y entrar sin password. Reemplazado por sesión HMAC firmada.
- ⚠️ **Antigravity introdujo el esqueleto de Neon** (`usuarios`, tablas de docencia/vinculación) con varios problemas que se corrigieron en el camino: contraseña compartida (`pineadmin2026`) sembrada para 5 cuentas con emails no confirmados/incorrectos (eliminadas), un secreto de sesión con fallback hardcodeado en el código fuente (`'fallback_secret_pine_2026'`, removido), `/admin/*` bloqueado sin condición para todos incluido el admin real (corregido), la página pública de Vinculación y `/registro` quedaron accidentalmente detrás de login (corregido).
- ✅ **Consolidación de sesión:** existían 3 cookies de sesión distintas y sin relación entre sí (`admin_session`, `usuario_session`, `pine_app_session`) — todo unificado en una sola (`pine_app_session` / `lib/session.ts`).
- ✅ **`profesoresAutorizados`** (lista fija de emails, no autoregistro abierto) + **`profesorModulos`** (asignación automática de `modulos_acceso` al registrarse) — decisión explícita del usuario: el rol `profesor` no es autoservicio libre.
- ✅ **Rediseño del flujo de Vinculación** siguiendo la cadena real descrita por el usuario (profesor crea espacio → asigna instructores → instructores operan su espacio) — antes cualquiera con sesión podía tocar cualquier espacio global. Ver `lib/permisos-espacio.ts`.
- ✅ **Área Investigación separada de Vinculación** (`espacios_enseñanza.area`) — antes compartían un solo panel confuso ("Docencia").
- ✅ **Gestión de Carrera** — registro de eventos abierto a cualquier docente, con categoría (investigación/vinculación/asignatura).
- ✅ **Eliminado:** tab "Calificaciones" del panel docente (decisión del usuario: el test MCER es la única evaluación real, esa nota manual no correspondía a nada), módulo viejo de asistencia UUID (`estudiantes`/`espacios`/`beneficiarios`/`bitacora_*`, reemplazado por el esquema nuevo sobre `usuarios`), scripts inseguros (`seed-roles.js`, `alter.js` con emails adivinados).
- ✅ `evaluaciones_mcer.beneficiario_id` corregido de UUID (apuntando a la tabla vieja) a entero contra `usuarios.id` — el guardado del test MCER estaba roto de origen.
- ℹ️ **Cabo suelto, sin resolver:** 4 tablas en Neon (`avance_investigacion`, `seguimiento_laboral`, `eventos_difusion`+`eventos_estudiantes`, `encuesta_satisfaccion` singular) creadas fuera de git, el usuario no las reconoce — quedan sin usar, a coordinar con Antigravity.
- ✅ **Resuelto:** `beneficiario` ya no tiene cuenta/password — `POST /api/beneficiarios` (nuevo) los crea como dato puro, lo da de alta el instructor/profesor desde `/vinculacion/beneficiarios`, no ellos mismos. `/registro` mantiene la opción `beneficiario` en el selector pero ya no se usa desde ningún link del sitio — candidato a quitarla del todo si nadie la necesita.
- ✅ **Resuelto (distinto al plan original):** el rol `estudiante` ya no autoregistra ni usa un array hardcodeado tipo `profesoresAutorizados`. En su lugar: el profesor pre-crea al pasante (`POST /api/estudiantes`, solo nombres/apellidos/email) con `usuarios.activado = false`; la primera vez que ese email intenta entrar por `/portal/login`, el password que escribe se guarda como su clave definitiva (`activado` pasa a `true`). Ver `### Pasantes` abajo. `/registro` ya no ofrece la opción "Estudiante" — solo `profesor` (whitelist) y `beneficiario` siguen ahí.
- ✅ Bug de paso: `isAdminAuthorized` solo dejaba pasar a 2 de los 4 `adminUsers` (German y Verónica tenían password válido pero quedaban bloqueados) — corregido para derivar de la misma lista. (Nota: este `adminUsers`/`lib/db.ts:authenticateAdmin` del panel legacy quedó como código muerto tras la migración a Neon — nada lo llama ya; candidato a limpieza futura.)
- ✅ **`/admin` restringido a Arturo+Jhonny:** el panel de contenido del sitio (10 secciones) se había quedado sin ningún link visible tras quitar el botón "Admin" del Header. Al restaurar el acceso, decisión explícita del usuario: no reutilizar el módulo `admin` genérico (lo tenían también German y Verónica, líderes de otros proyectos) — nuevo módulo `contenido_sitio`, solo para líder/colíder de este proyecto específico. Nueva tarjeta separada "Gestión del Sitio" en `/portal/dashboard` (no fusionada con "Indicadores"). Importante: el cambio en `profesorModulos` **no** actualiza retroactivamente cuentas ya registradas en Neon — hubo que hacer `UPDATE usuarios SET modulos_acceso = array_append(...)` a mano para la cuenta de Arturo.
- ⚠️ **Identidad fabricada encontrada y eliminada:** "Mg. Veronika Vera" (`member_12`, líder de un supuesto proyecto "Mentoría Lingüística", email `veronika@uleam.edu.ec`) resultó ser inventada por Antigravity — el usuario confirmó que solo `veronica.chavez@uleam.edu.ec` es real. Se eliminó la entrada en `members`, la página pública `/investigacion/mentoria-linguistica` (copia literal de `desarrollo-habilidades` con el texto cambiado) y el link del Header. Mismo patrón de fondo que los emails adivinados de Cristina/Johana corregidos antes en esta sesión — **Antigravity ha inventado datos de personas reales más de una vez sin decirlo**, verificar siempre antes de confiar en un nombre/email/proyecto que aparezca sin que el usuario lo haya mencionado primero.
- ℹ️ **Nota (Sesión 24, confirmada con el usuario):** la persona real `veronica.chavez@uleam.edu.ec` (Verónica Chávez Zambrano) sí lidera un proyecto propio, distinto de la "Mentoría Lingüística" fabricada arriba. `lib/data.ts:liderProyectoPropio` ya la tenía con la etiqueta corta `'Mentoring'` (junto con `'Desarrollo de Habilidades Lingüísticas'` de German) — esa etiqueta corta sigue así, es solo para la tarjeta "Gestionar {proyecto}" de `/portal/dashboard`. Los nombres **oficiales completos** (los que van en documentos PAT) son otros — ver `### Proyectos del grupo — nombres oficiales` abajo.

### Proyectos del grupo — nombres oficiales (Sesión 24)

Usados tal cual en el dropdown "Proyecto" del wizard de Contribuciones Académicas (`app/contribuciones/new/[type]/page.tsx` → `PROYECTOS`) y en los registros ya cargados en Neon. Confirmados por el usuario — no son los mismos que las etiquetas cortas de `lib/data.ts` (que son solo para UI del Portal):

| Líder | Etiqueta corta (`liderProyectoPropio`/UI) | Nombre oficial completo (PAT / BD) |
|---|---|---|
| Arturo Rodríguez / Jhonny Villafuerte | Innovaciones Pedagógicas e Internacionalización | "Lograr la innovación pedagógica e internacionalización del proceso de formación inicial y continua de docentes para el desarrollo humano y sostenible." |
| German Carrera | Desarrollo de Habilidades Lingüísticas | "Desarrollo de las habilidades lingüísticas del idioma inglés en estudiantes de educación superior en Ecuador." |
| Cynthia Zambrano | Dinámicas Lingüísticas en Contextos Locales | Dinámicas Lingüísticas en Contextos Locales (mismo nombre, confirmado por el usuario — es el título de la página pública `/vinculacion/dinamicas-linguisticas`) |
| Verónica Chávez | Mentoring | "Desarrollo Humano y perfil profesional en la formación de docentes: Mentoría y Aprendizaje Socioemocional" — página pública desde Sesión 26: `/investigacion/mentoring` |

⚠️ **`CategoriaDocente` ampliado:** el enum solo llegaba hasta `AGREGADO_II` — el escalafón docente ULEAM sí tiene `AGREGADO_III` (confirmado por el usuario, caso real: Jhonny Villafuerte). Agregado a mano en Neon (`scripts/migrate-agregado3.js`, `ALTER TYPE ... ADD VALUE`, no `prisma db push`) + `prisma/schema.prisma` + `app/api/contribuciones/route.ts` (zod) + `CATEGORIAS_DOCENTE` del wizard. Los 3 deben mantenerse sincronizados si se agrega otro valor.

✅ **9 registros reales cargados** (8 artículos regionales + 1 de alto impacto, de Arturo, Jhonny y Cristina Basantes) vía `scripts/seed-articulos-regionales.js` + `scripts/seed-articulo-impacto-1.js` — Prisma directo contra la Neon de producción (mismo `DATABASE_URL` que usa el deploy), no por el wizard HTTP (no había forma de autenticar una sesión de navegador desde este entorno). Sirvió para confirmar que el schema/enum acepta los datos reales antes de dejar el módulo en manos del equipo.

⚠️ **Corrección sobre `tipoArticulo`:** en la primera pasada del wizard se bloqueó este campo derivándolo de `tipoPublicacion` ("Artículo Regional"/"Artículo de Alto Impacto"), asumiendo que era redundante con la selección de tipo. **Era un error** — el formato oficial (`TIPO_ARTICULO` en la plantilla PAT) es un campo independiente que describe el medio/naturaleza del artículo (valores reales vistos: `"Revista"` para los 8 regionales, `"Investigación"` para el de alto impacto) y varía libremente por artículo. Revertido a input de texto libre en `app/contribuciones/new/[type]/page.tsx`; los 8 registros ya cargados se corrigieron con `scripts/fix-articulos-regionales.js` (también rellenó `identificacionParticipante`, que el formato oficial usa para el **nombre** del participante, no una cédula — se había dejado vacío — y `codigoPublicacion`, que guarda el link DOI, distinto de `linkPublicacion` que es la página del artículo en la revista).

---

## Cambios Recientes (Sesión 8 — 2026-04-26)

- ✅ Foto de Johana Bello actualizada (`JohanaBello.jpeg`)
- ✅ Andy Castillo agregado como Estudiante Investigador (`ANdyCastilo.png`)
- ✅ 5 nuevas publicaciones agregadas (libro + 4 artículos científicos)
- ✅ Libro descargable en PDF: `public/files/Libro-Innovaciones-Educativas.pdf`
- ✅ QWEN.md eliminado (ya no se usa Qwen)
- ✅ Carpeta `.qwen/` eliminada
- ✅ PocketBase eliminado completamente (`pocketbase/`, `.zip`, scripts, docs)
- ✅ Carpeta `frontend/` legacy eliminada
- ✅ Imágenes duplicadas de raíz eliminadas (todas en `public/images/`)
- ✅ Docs Word organizados en `docs/`
- ✅ Push a GitHub completado (commit `759f9e9`)

---

## Cambios Recientes (Sesión 9 — 2026-06-07)

- ✅ Nombre del Grupo de Investigación actualizado: "Innovaciones pedagógicas para el desarrollo sostenible: inclusión, interculturalidad e interdisciplinaridad" (doc oficial 2026-05-15)
- ✅ Documento `2026_GrupoInvestigacion.pdf` agregado a `public/admin-assets/` y registrado en `app/admin/documents/page.tsx`
- ✅ Nueva publicación `pub_64`: libro-podcast "An educational innovation in foreign Languages instruction" (Villafuerte-Holguín et al., 2026, Ediciones ULEAM), PDF descargable en `public/files/Libro-Podcast-Educacion-Innovadora.pdf`

---

## Cambios Recientes (Sesión 10 — 2026-06-07)

- ✅ Nuevos componentes de difusión QR: `QRFloatingButton.tsx` (botón flotante), `QRModal.tsx` (modal con QR + compartir WhatsApp), `QRPromoModal.tsx` (modal promocional auto-abierto)
- ✅ `ActivityGallery.tsx` y `SubstantiveFunctionsSection.tsx` agregados a la landing (galería de actividades + sección de funciones sustantivas — Docencia/Investigación/Vinculación)
- ✅ 3 nuevos miembros del **Equipo de Podcast**: Josselyn Mera Rivas, Doménica Valeska Vélez Bravo, Ailys Jordana Bailón Borja (`member_6`–`member_8`)
- ✅ Publicaciones `pub_1` y `pub_2` retiradas; nueva `pub_63` agregada: "Transition from Regular English Instruction to Bilingual Education: An Experience Using Gamification" (Piloso-Cedeño & Villafuerte-Holguín, regional)
- ✅ Fix: logo del Hero (256px) se solapaba con el texto del nav (`Inicio`, `Acerca de`, `Equipo`...) en pantallas PC de poca altura (~768px) — `Hero.tsx` ahora usa `pt-24 md:pt-28` para reservar espacio bajo el header; `Header.tsx` cambia `bg-transparent` por degradado translúcido (`from-uleam-blue/70...to-transparent backdrop-blur-sm`) y ajusta breakpoints del nombre/nav para que no se encimen en anchos medianos
- ✅ PDF "Informe Mensual Comisión Mayo" agregado a `public/admin-assets/`

---

## Cambios Recientes (Sesión 18 — 2026-08-18)

### Corrección de tags mal asignados + estructura de 3 ejes en Vinculación

- ✅ **5 videos con tag `vinculacion` incorrecto → cambiados a `investigacion`:** `video_4` (Cursos vacacionales), `video_6` (PsicoEducarte | Rol del Psicólogo Educativo), `video_15`/`video_17`/`video_20` (serie Más Allá del Lienzo). No correspondían a vinculación con la sociedad sino a colaboración interdisciplinaria/reflexión académica del proyecto. Quedan 8 videos con tag `vinculacion` (todos con mención explícita de vinculación en su descripción).
- ✅ Página `/vinculacion/dinamicas-linguisticas` reestructurada en **3 ejes** (a pedido explícito — el proyecto de vinculación se compone de estas 3 líneas):
  1. **Club de Inglés en Escenarios Locales** — nuevo componente `EnglishClubSection.tsx`, lee de un array nuevo `vinculacionEnglishClubPhotos` en `lib/data.ts` (tipo `VinculacionEnglishClubPhoto` en `types/index.ts`). A diferencia de `activities[]` (que **siempre** pertenece a la carrera completa, ver comentario en `types/index.ts`), este array es específico del proyecto de vinculación — se irá ampliando con más fotos/actividades del club a futuro. Primera foto: `public/images/ClubIngles-EscenariosLocales-Agosto2026.jpeg` (movida desde la raíz del repo, donde había quedado por auto-commit).
  2. **Podcasts y Estrategias de Difusión** — sin cambios, `TaggedVideoSection` (tag `vinculacion`).
  3. **Procesos de Investigación Educativa** — nuevo componente `VinculacionResearchSection.tsx`: muestra `pub_3` (libro "Innovaciones Educativas: Experiencias de vinculación social...") y `news_10` (capacitación de transferencia a la carrera de Pedagogía de Lengua y Literatura) como evidencia existente de investigación producida en el marco de la vinculación. Se buscó entre publicaciones/noticias ya existentes en `lib/data.ts` — no se inventó contenido nuevo.
- ℹ️ `activity_13` ("Actividades de Investigación Educativa — 5to Semestre PINE", trabajo de campo en el Gimnasio) **no** se movió a Vinculación: es una actividad de cátedra (5to semestre PINE), no de vinculación con la sociedad, y las actividades de `activities[]` no se filtran por proyecto por diseño.

---

## Cambios Recientes (Sesión 17 — 2026-08-18)

### Header con dropdowns por función sustantiva + 2 páginas de proyecto nuevas

- ✅ `Header.tsx`: nav ahora tiene 3 categorías con dropdown (click, cierre al click-afuera, versión mobile en acordeón) — **Docencia**, **Investigación**, **Vinculación**. Cada una despliega el proyecto correspondiente.
  - Investigación → `/investigacion/proyecto-innovacion` (existente, sin cambios de contenido)
  - Vinculación → `/vinculacion/dinamicas-linguisticas` (nueva) — "Dinámicas Lingüísticas en Contextos Locales"
  - Docencia → `/docencia/docencia-innovadora` (nueva) — "Docencia Innovadora e Interdisciplinaria"
- ✅ 2 páginas nuevas creadas con componentes compartidos: `ProjectHero.tsx`, `ProjectIntegrationNote.tsx` (nota de integración con el proyecto de investigación + link de vuelta), `TaggedVideoSection.tsx` (filtra podcasts por `tags` en vez de `category` — reutiliza `videos` de `lib/data.ts`, no se duplicó ningún video)
  - Los podcasts ya tenían `tags: ['docencia']` / `tags: ['vinculacion']` en `lib/data.ts` desde antes — la nueva sección los agrupa por función sustantiva sin mover ni duplicar entradas en `videos[]`
  - Cada página nueva incluye texto explícito de integración entre proyectos (producción técnica conjunta del podcast institucional vía Radio ULEAM/YouTube)
- ✅ Todas las cadenas nuevas agregadas a `lib/i18n.tsx` (ES+EN) bajo `nav.docencia/investigacion/vinculacion` y las secciones nuevas `docenciaProject` / `vinculacionProject`
- ℹ️ `ProjectHero`, `ProjectIntegrationNote`, `TaggedVideoSection` reciben `projectKey: 'docenciaProject' | 'vinculacionProject'` y resuelven sus propios textos vía `useLanguage()` — así las páginas contenedoras siguen siendo server components y conservan `export const metadata`
- ℹ️ HubProjectsSection (página `/`) no fue tocada — solo se pidió el dropdown del header, no tarjetas nuevas en el hub
- ✅ **Corrección de tags mal asignados:** 5 videos tenían `tags: ['vinculacion']` sin corresponder (colaboraciones interdisciplinarias del proyecto, no vinculación con la sociedad) → cambiados a `'investigacion'`: `video_4` (Cursos vacacionales), `video_6` (PsicoEducarte | Rol del Psicólogo Educativo), `video_15`/`video_17`/`video_20` (serie Más Allá del Lienzo). Quedan 8 videos con tag `vinculacion` (todos con mención explícita de vinculación en su descripción). Esto los saca de `/vinculacion/dinamicas-linguisticas` y les cambia el badge en `VideoCard` a "Investigación".

---

## Cambios Recientes (Sesión 16 — 2026-08-14)

### Auditoría de coherencia integral (repo, rutas, imágenes)

- ✅ **Ruta pública movida:** `app/pine` → `app/investigacion/proyecto-innovacion`. Actualizadas 3 referencias: `Header.tsx` (nav), `HubProjectsSection.tsx` (card enlace), `QRModal.tsx` (`SITE_URL` para QR + WhatsApp share)
- ✅ **9 imágenes rotas corregidas** (404 en producción) — `public/images/` se había reorganizado en subcarpetas (`logos/`, `members/`, `activities/`) pero 8 componentes seguían con paths planos viejos:
  - `Header.tsx`, `Hero.tsx` → `logo-proyecto.png` (logo del nav y hero)
  - `CertificateTemplate.tsx` → 4 logos (certificados generados)
  - `ConnectionsSection.tsx` → 3 logos
  - `HubProjectsSection.tsx` → `logo-red-lea.jpeg`
  - `VideoGallery.tsx` → `logo-radio-uleam.png`
  - `ActivityGallery.tsx`, `NewsSection.tsx` → 2 fotos de actividad podcast (datos fallback)
  - `TeamSection.tsx` → fotos líder/colíder (datos fallback) + comentario obsoleto "PocketBase" corregido
- ✅ **Referencia de repo vieja eliminada:** `CHANGELOG.md` apuntaba a `proyecto-innovacion-e-internacionalizacion.git` (nombre pre-cambio) → corregido a `carrerapineuleam.git`
- ℹ️ Pendiente de decisión (no tocado): `public/images/redlea/02-logos/` (2 imágenes sin uso), `public/admin-assets/2026_ProyectoActualizado.pdf` (huérfano, sin entrada en `app/admin/documents/page.tsx`), URLs viejas de vercel (`proyecto-innovacion-e-internacional.vercel.app`) dentro de `graphify-out/` (gitignored) y `material-web-REDLEA/*.md` (docs archivados, no código vivo)

---

## Cambios Recientes (Sesión 14 — 2026-08-14)

### Actividades de Docencia Innovadora e Interdisciplinaria

- ✅ `activity_7`: Presentación de Trabajos Finales — Mandiles para Enseñanza de Vocabulario en Inglés (4to semestre PINE, julio 2026)
- ✅ `activity_8`: Feria de Proyectos STEAM (9no semestre, junio 2026)
- ✅ `activity_9`: Educación Inclusiva en el Aula de Inglés — TDAH y TES
- ✅ `activity_10`: Feria de Estrategias de Lectura de Cuentos Infantiles (4to semestre PINE)
- ✅ `activity_11`: Práctica de Gestión de Emociones (padres y docentes)
- ✅ `activity_12`: Estrategia de Juegos de Mesa para la Práctica del Inglés (mayo 2026)
- ✅ `activity_13`: Investigación Educativa con Trabajo de Campo en Gimnasio (5to semestre PINE, salud universitaria y entrenamiento físico)
- ✅ `activity_14`: Estrategia de Enseñanza de Inglés mediante Museos (5to semestre, mayo 2026)

**Imágenes agregadas a `public/images/`:**
- `Mandiles-Vocabulario-Ingles-Julio2026.jpeg`
- `Feria-Proyectos-STEAM-Junio2026.jpeg`
- `Educacion-Inclusiva-Ingles-TDAH-TES.jpeg`
- `Feria-Estrategias-Lectura-Cuentos-4toSemestrePINE.jpeg`
- `Practica-Gestion-Emociones-Padres-Teachers.jpeg`
- `Estrategia-Juegos-Mesa-Ingles-Mayo2026.jpeg`
- `Investigacion-Educativa-5toSemestrePINE-Gimnasio.jpeg`
- `Estrategia-Museo-Ingles-5toSemestreMayo2026.jpeg`

---

## Cambios Recientes (Sesión 13 — 2026-07-21)

- ✅ `member_9`: Diana Noemi Cedeño Sánchez agregada como Estudiante Investigadora / Equipo de Podcast
- ✅ Foto: `public/images/DianaNoemCedenoSanchez.jpeg`

---

## Cambios Recientes (Sesión 12 — 2026-06-23)

- ✅ `video_9`: "EDUCAPINE | Vinculación y experiencias de los estudiantes de PINE" (embed: `Nj2TFVY7GFs`, cat_1)
- ✅ `video_10`: "EducaPine | Innovación Educativa y las nuevas metodologías" (embed: `DcH6yM8jaaU`, cat_1)
- ✅ `pub_71`: libro "El tamaño de lo que sentimos" — Castillo Menéndez, Rodríguez Zambrano & Cedeño Briones — Ediciones ULEAM, junio 2026 — PDF: `public/files/DIPSB-PUB2026-024-El-tamano-de-lo-que-sentimos.pdf`
- ✅ `news_5`: noticia destacada sobre publicación del libro (is_featured: true)

---

## Cambios Recientes (Sesión 11 — 2026-06-09)

- ✅ 6 nuevas publicaciones agregadas (`pub_65`–`pub_70`): solo `pub_66` (Profesorado, Comunicación asertiva y gamificación) categorizada `impacto`; resto `regional` (Education Quarterly Reviews, Sapienza, Technium)
- ✅ `pub_63` (Piloso-Cedeño & Villafuerte-Holguín) DOI actualizado: preprint OSF → DOI publicado `10.31014/aior.1993.08.02.588`
- ℹ️ Diagrama de Venn (`SubstantiveFunctionsSection.tsx`) cuenta `publications.length` automáticamente — no requiere actualización manual al agregar publicaciones

---

## Estructura de Archivos

```
carreraPINE/                       ← RAÍZ = Next.js app
├── CLAUDE.md                      # Este archivo (instrucciones para Claude)
├── ANTIGRAVITY.md                 # Instrucciones equivalentes para Antigravity
├── MANUAL_USUARIO.md              # Manual del Portal PINE, por rol
├── CHANGELOG.md / README.md / RESUMEN.md / DEPLOY_GUIDE.md   # ⚠️ obsoletos, de la era pre-PocketBase-removal — no confiar, no se actualizan
├── package.json
├── middleware.ts                  # Protege /admin/*, /portal/*, /vinculacion/espacios*, /investigacion/espacios*, /gestion-carrera, /pine-dashboard
├── .env.local.example
│
├── app/
│   ├── page.tsx, layout.tsx       # Landing pública
│   ├── admin/                     # Panel legacy CRUD sitio estático (gateado por modulos_acceso:contenido_sitio — solo Arturo+Jhonny)
│   ├── portal/{login,dashboard}/  # Entrada única del Portal PINE
│   ├── registro/                  # Autoregistro — solo profesor (whitelist), único rol público desde Sesión 22
│   ├── vinculacion/                # Gestión (profesor) vs Registro (estudiante+profesor) — ver ## Portal PINE
│   │   ├── espacios/               # Gestión: crear/listar espacios; [id] = asignar instructores (única función que queda ahí)
│   │   ├── pasantes/               # Gestión: vista agregada de estudiantes-instructores, solo profesor/admin
│   │   ├── asistencia/, beneficiarios/, test-mcer/, encuesta/  # Registro: 4 páginas planas, cada una con selector de espacio propio
│   │   ├── difusion/               # Registro: formulario simple, sin selector de espacio
│   │   └── dinamicas-linguisticas/ # Página PÚBLICA de contenido (no confundir con nada de arriba)
│   ├── investigacion/
│   │   ├── espacios/              # Crear/listar espacios de investigación
│   │   └── proyecto-innovacion/, desarrollo-habilidades/, mentoring/  # Páginas públicas de proyecto
│   ├── gestion-carrera/           # Registro de eventos, cualquier docente
│   ├── contribuciones/            # Contribuciones académicas (Sesión 24) — listado (solo admin) + wizard (docentes)
│   │   ├── page.tsx                # Listado, protegido por middleware (modulos_acceso:admin)
│   │   └── new/{page.tsx,[type]/page.tsx}  # Paso 1 (elegir tipo) + Paso 2 (formulario)
│   ├── pine-dashboard/            # KPIs, solo modulos_acceso:admin
│   ├── docencia/, login/          # Redirects a las rutas nuevas (compat)
│   └── api/
│       ├── auth/{portal-login,register,logout,me}/
│       ├── espacios/{route,asignar,instructores,asistencia}/
│       ├── beneficiarios/, estudiantes/, tests/, encuestas/, difusion/, upload/
│       ├── contribuciones/         # GET/DELETE solo admin, POST cualquier docente — vía Prisma, no SQL crudo
│       ├── admin/stats/           # KPIs para /pine-dashboard
│       └── protected/assets/[filename]/   # PDFs privados de public/admin-assets
│
├── components/                    # Componentes React del sitio público
│   └── admin/DataTable.tsx
│
├── lib/
│   ├── data.ts                    # Fuente de verdad del sitio ESTÁTICO (miembros, publicaciones, etc.) — incluye profesoresAutorizados/profesorModulos
│   ├── db.ts                      # In-memory CRUD sobre data.ts (solo panel admin legacy)
│   ├── session.ts                 # Auth unificada del Portal (Neon) — pine_app_session
│   ├── permisos-espacio.ts        # puedeOperarEspacio() — permisos por espacio
│   ├── neon.ts                    # Tipos del esquema viejo (estudiantes/espacios/beneficiarios) — huérfano
│   ├── prisma.ts                  # Cliente Prisma (singleton) — solo lo usa el módulo Contribuciones
│   ├── questions.ts                # Banco de preguntas del Test MCER
│   └── certificateDocx.ts          # Generación de certificados .docx
│
├── prisma/schema.prisma           # Solo modela Contribution/ContributionAuthor — NO ejecutar db push/migrate (ver ## Stack Técnico)
│
├── scripts/                       # Migraciones Neon (una sola ejecución cada una, con node --env-file=.env.local)
│   ├── migrate.js                 # Schema original (desactualizado vs realidad, ver ## Portal PINE)
│   ├── migrate-espacios-v2.js     # area, espacio_instructores, asistencia_*, columnas de difusión
│   ├── migrate-contribuciones.js  # CREATE TABLE a mano de Contribution/ContributionAuthor (Sesión 24)
│   └── fix-mcer-schema.js         # Fix puntual de evaluaciones_mcer
│
├── types/index.ts                 # Interfaces TypeScript del sitio estático
│
├── public/
│   ├── images/, files/            # Públicos
│   └── admin-assets/              # Privados, requiere sesión admin
│
└── docs/                          # Documentos Word de referencia
```

---

## Equipo actual (tabla `members` en Neon)

Desde la Sesión 26, `members.projects` (`text[]`, migrado directo en Neon vía MCP — ver `scripts/migrate-members-projects.js` como referencia del mismo cambio) filtra en qué página de proyecto aparece cada quien — antes `TeamSection` mostraba a todos los miembros en todas las páginas de proyecto sin distinción, lo que hacía aparecer a German y Cynthia (líderes de proyecto propio) también en el equipo de Internacionalización. `GET /api/members?project=X` filtra por este campo; `TeamSection` acepta la prop `project` y cada página de proyecto la pasa (ver `## Estructura de Archivos`). Valores válidos: `internacionalizacion` | `vinculacion` | `desarrollo_habilidades` | `mentoring`. El panel `/admin/members` tiene checkboxes para editar `projects` de cada miembro.

| ID | Nombre | Rol | Proyectos | Orden |
|----|--------|-----|-----------|-------|
| member_1 | Dr. Arturo Rodríguez | Líder de Internacionalización y Miembro de Vinculación | internacionalizacion | 1 |
| member_2 | Dr. Jhonny Villafuerte | Colíder del Proyecto | internacionalizacion | 2 |
| member_3 | Mg. Cristina Basantes | Miembro de Investigación y Colaboradora de Internacionalización (Podcast) | desarrollo_habilidades, internacionalizacion | 3 |
| member_4 | Psi. Johana Bello, Mg. | Colaboradora en Investigación y Directora de Psicología Educativa | internacionalizacion | 4 |
| member_5 | Andy Castillo | Estudiante Investigador | internacionalizacion | 5 |
| member_6 | Josselyn Mera Rivas | Estudiante Investigadora / Equipo de Podcast | internacionalizacion | 6 |
| member_8 | Ailys Jordana Bailón Borja | Estudiante Investigadora / Equipo de Podcast | internacionalizacion | 7 |
| member_7 | Doménica Valeska Vélez Bravo | Equipo de Podcast | internacionalizacion | 8 |
| member_9 | Diana Noemi Cedeño Sánchez | Estudiante Investigadora / Equipo de Podcast | internacionalizacion | 9 |
| member_10 | Dr. German Carrera Moreno, PhD. | Líder de Proyecto (Desarrollo de Habilidades Lingüísticas) — ver `/investigacion/desarrollo-habilidades` | desarrollo_habilidades | 10 |
| member_11 | Mg. Cynthia Zambrano Zambrano | Líder de Proyecto (Vinculación) — ver `/vinculacion/dinamicas-linguisticas` | vinculacion | 11 |
| member_12 | Mg. Verónica Chávez | Responsable de Comisión Académica y Líder de Proyecto (Mentoring) — ver `/investigacion/mentoring`, nueva en Sesión 26. Sin foto todavía (placeholder), pendiente subir imagen real. | mentoring | 12 |

Cristina Basantes es el único caso con dos proyectos — confirmado explícitamente por el usuario: colídera de Desarrollo de Habilidades Lingüísticas (con German) y además colaboradora de Internacionalización (coordina el Podcast ahí). No es un ajuste automático ni aplica al resto del equipo.

⚠️ **Distinto del `member_12` fabricado anteriormente:** en Sesión 19 existió un `member_12` ("Mg. Veronika Vera", líder de un supuesto proyecto "Mentoría Lingüística") que resultó ser una identidad **fabricada por Antigravity** (email inventado, sin confirmar con el usuario) — se eliminó junto con su página pública (`/investigacion/mentoria-linguistica`) y su link en el Header. El `member_12` actual (Verónica Chávez) es una persona real, ya confirmada desde antes en `profesoresAutorizados`/`profesorModulos`/`liderProyectoPropio` (`lib/data.ts`) — no confundir ambos casos. Regla de oro sigue vigente: **nunca inventar/adivinar un email o una persona**, confirmar siempre con el usuario antes de agregar a `members`, `profesoresAutorizados` o `profesorModulos`.

---

## Publicaciones actuales (`/lib/data.ts` → `publications`)

| ID | Título (abrev.) | Tipo | Categoría | Fecha |
|----|----------------|------|-----------|-------|
| pub_64 | Podcast: An educational innovation in foreign Languages instruction (libro) | book | libros | 2026-01 |
| pub_3 | Innovaciones Educativas (libro) | book | libros | 2026-04 |
| pub_62 | Total Physical Response… | article | impacto | 2026-04 |
| pub_60 | Microenseñanza con tecnologías… | article | regional | 2026-03 |
| pub_58 | Comparación nivel de lectura… | article | impacto | 2026-03 |
| pub_61 | Identifying Main Causes… | article | regional | 2026-06 |
| pub_63 | Transition from Regular English Instruction to Bilingual Education… | article | regional | 2025-01 |
| pub_64 | Podcast: An educational innovation in foreign Languages instruction (libro) | book | libros | 2026-01 |
| pub_65 | Use of Podcasts for Leadership and Emotional Intelligence Development… | article | regional | 2026-01 |
| pub_66 | Comunicación asertiva y gamificación: docentes y síndrome de Down | article | impacto | 2025-07 |
| pub_67 | Inclusive Education and the Use of Assistive Technologies… | article | regional | 2025-05 |
| pub_68 | Educational technology and teachers: effective teaching time… | article | regional | 2025-01 |
| pub_69 | Implementing Project-Based Learning in English Classes | article | regional | 2025-09 |
| pub_70 | Podcasting to sensitize gender equity in English language student teachers | article | regional | 2025-01 |
| pub_71 | El tamaño de lo que sentimos (libro ilustrado) | book | libros | 2026-06 |

**Categorías de publicaciones:** `regional` | `libros` | `impacto`
**Índices:** ErihPlus → impacto | Latindex/Dialnet → regional

---

## Base de Datos Estática (sitio público — distinta del Portal PINE/Neon)

> La fuente de verdad es `/lib/data.ts`. El admin panel legacy NO es persistente (usa db.ts en memoria). Para la base de datos real del Portal PINE (Neon Postgres), ver `## Portal PINE` arriba.

### Entidades disponibles

| Entidad | Notas |
|---------|-------|
| `members` | Equipo del proyecto |
| `publications` | Artículos, libros, conferencias |
| `videos` | Podcasts (Educa PINE + Voces Fuera del Aula) |
| `video_categories` | Categorías de videos |
| `news` | Noticias del proyecto |
| `activities` | Actividades/eventos |
| `site_settings` | URLs sociales, email de contacto |
| `adminUsers` | Usuarios del panel admin |

---

## Gestión de Archivos — Regla de Ubicación

> **CRÍTICO:** Antes de colocar cualquier archivo, determinar si debe ser público o privado.

| Carpeta | Acceso | Usar para |
|---------|--------|-----------|
| `public/images/` | **Público** (cualquier URL) | Fotos de miembros, logos, imágenes de noticias/actividades |
| `public/files/` | **Público** (cualquier URL) | PDFs de **publicaciones científicas** descargables desde la landing |
| `public/admin-assets/` | **Privado** (requiere sesión admin) | PDFs confidenciales: presupuestos, informes internos, documentos de actividades del proyecto |

### Reglas de oro
- **Nunca** poner documentos internos del proyecto (presupuestos, actas, informes de actividades) en `public/files/` ni en `public/images/` — quedan expuestos a internet.
- Solo van a `public/files/` los PDFs que el equipo quiere que el público general descargue (artículos científicos, libro del proyecto).
- Para agregar a la sección admin Documentos: copiar a `public/admin-assets/` y agregar entrada en `app/admin/documents/page.tsx`.
- Las noticias y actividades **no** llevan link de descarga pública — sus documentos van a `public/admin-assets/`.

### Estándar de nombres de archivo (Sesión 26, 2026-09-02)

**Todo archivo nuevo** en `public/images/`, `public/files/` o `public/admin-assets/` — subido por Claude o por Antigravity — debe nombrarse:

```
YYYY-MM-DD_DescripcionCorta[-signed].ext
```

- `YYYY-MM-DD`: fecha del **documento/evento** (no la fecha en que se sube). Si el archivo tiene varias fechas (ej. rango de una capacitación), usar la fecha de cierre/emisión del certificado.
- `DescripcionCorta`: PascalCase o palabras unidas por guiones, **sin espacios, tildes, ñ, mayúsculas sostenidas ni caracteres especiales** (nada de `Informe_sOCIALZACIÓN_dISNEY.pdf`).
- Sufijo `-signed` solo si el PDF está firmado digitalmente.
- Extensión en minúsculas (`.pdf`, `.jpeg`, `.png`).
- Ejemplo real: `2026-08-13_CertificadosCapacitacionAsierRomero-FET-signed.pdf`, `2026-08-13_Capacitacion-AsierRomero-Auditorio.jpeg`.

**Skill `plugin:estandar-archivos` disponible en este repo** (`.claude/skills/estandar-archivos/SKILL.md`) — Claude Code debe invocarlo antes de mover/copiar cualquier archivo nuevo a `public/`. Antigravity no tiene el mecanismo de skills de Claude Code: debe seguir esta misma regla leyéndola aquí directamente.

⚠️ **Archivos ya existentes (previos a Sesión 26) NO siguen este estándar** (`2026_FICHA_PRESUPUESTARIA.pdf`, `Informe_sOCIALZACIÓN_dISNEY-signed.pdf`, `Informe-Ejetutivo-DRP.pdf`, etc.) — no renombrarlos sin querer: varios están referenciados por nombre exacto en `app/admin/documents/page.tsx` y algunos PDFs de `public/files/` podrían estar linkeados desde `publications.pdf_file` en Neon. Renombrarlos requiere actualizar esas referencias en el mismo cambio — es una limpieza aparte, pendiente, no bloqueante.

---

## Flujos de Trabajo Recurrentes

### Agregar publicación con enlace únicamente
1. Abrir `lib/data.ts`
2. Agregar entrada en el array `publications` con:
   - `id`: `pub_XX` (número correlativo)
   - `type`: `'article'` | `'conference'` | `'book'` | `'other'`
   - `category`: `'impacto'` (ErihPlus, Scopus, WoS) | `'regional'` (Latindex, Dialnet) | `'libros'`
   - `doi_link`: URL del artículo o DOI
   - Omitir `pdf_file` si no hay PDF
3. Verificar TypeScript: `npx tsc --noEmit`

### Agregar publicación descargable (PDF)
1. Colocar el PDF en `public/files/` (nombre sin espacios, ej. `Nombre-Articulo.pdf`)
2. Agregar entrada en `publications` con `pdf_file: '/files/Nombre-Articulo.pdf'`
3. El componente `PublicationsSection.tsx` renderiza automáticamente el botón **PDF**

### Actualizar o agregar miembro del equipo
1. Colocar la foto en `public/images/` (puede partir de la raíz del proyecto — moverla aquí)
2. Agregar/editar entrada en el array `members` de `lib/data.ts`
3. Campos: `name`, `role`, `orcid` (opcional), `email`, `photo: '/images/archivo.jpg'`, `order`
4. Para diferenciar estudiantes usar `role: 'Estudiante Investigador'`

### Leer documentos Word para actualizar contenido
- Los `.docx` de referencia están en `docs/`
- Para extraer texto usar el skill `plugin:anthropic-skills:docx`
- Contenido a completar:
  - `docs/Proyecto_Innovaciones_Pedagógicas 2025.docx` → sección "Sobre el Proyecto" en landing
  - `docs/contenidoYoube.docx` → videos adicionales
  - `docs/contactos.docx` → site_settings (email, redes sociales)
  - `docs/publicaciones.docx` → publicaciones adicionales

### Reorganizar/limpiar estructura
- Imágenes: siempre en `public/images/` (nunca en raíz)
- PDFs descargables: `public/files/`
- Documentos de referencia: `docs/`
- No crear carpetas adicionales sin necesidad

---

## Autenticación Admin (panel legacy)

> ⚠️ **Obsoleto:** ya NO hay password fijo `Pine2026` ni lista de emails hardcodeada en middleware. El panel `/admin` se accede vía `/portal/login` con la cuenta de cada quien, y requiere `modulos_acceso` incluya **`contenido_sitio`** — **no** `admin` (son módulos distintos, ver `## Portal PINE`). `contenido_sitio` está restringido, por decisión explícita del usuario, solo a `arturo.rodriguez@uleam.edu.ec` y `jhonny.villafuerte@uleam.edu.ec` (líder/colíder de este proyecto específico) — German y Verónica tienen `admin` (ven `/pine-dashboard`) pero no `contenido_sitio`.
> `lib/data.ts:adminUsers` (los 4 emails con password `Pine2026`) y `lib/db.ts:authenticateAdmin`/`isAdminAuthorized` son **código muerto** — nada los llama desde la migración a Neon. Candidato a limpieza futura, no borrado por si algo externo los referencia todavía.
- **Middleware:** `middleware.ts` protege `/admin/*`, `/portal/dashboard`, `/vinculacion/espacios*`, `/investigacion/espacios*`, `/gestion-carrera`, `/pine-dashboard`.

---

## Comandos Útiles

```bash
# Desarrollo (desde la raíz del proyecto)
npm run dev           # http://localhost:3000

# Build y verificación
npm run build
npx tsc --noEmit      # Solo verificar TypeScript

# Git
git status
git add <archivos>
git commit -m "feat: descripción"
git push
```

---

## Instrucciones para el Asistente IA

1. **Lee este archivo primero** para entender el contexto completo
2. **App Router de Next.js 14** — no usar `pages/`
3. **`tsconfig.json` tiene `strict: true`**, pero `any` explícito se usa libremente en el código del Portal (fetch de APIs, formularios) — no es un objetivo real del proyecto, no lo trates como regla a cumplir
4. **TailwindCSS** — no añadir CSS inline salvo excepciones
5. **Colores ULEAM:** clases definidas en `tailwind.config.ts`
6. **No tocar `middleware.ts`** sin entender la lógica de auth — ahora protege bastante más que `/admin/*` (ver `## Portal PINE`)
7. **Dos fuentes de verdad distintas:** `lib/data.ts` (sitio público estático) vs Neon Postgres (Portal PINE, operativo) — no confundirlas
8. **Antes de tocar el esquema de Neon:** correr una consulta de auditoría (`information_schema.tables`/`columns`) primero — hay historial de cambios hechos fuera de git que desincronizan `scripts/migrate.js` de la realidad
9. **Actualizar este CLAUDE.md** cuando cambien el equipo, publicaciones, estructura, o el esquema/flujo del Portal PINE
10. **Trabajo en paralelo con Antigravity:** revisar `git log origin/main..HEAD` y `git fetch` antes de asumir que el repo está como lo dejaste — Antigravity pushea directo a `main` sin avisar
11. **Antes de editar el sitio público (páginas de proyecto, footer, equipo, textos):** leer `.claude/skills/carrerapine-workflow/SKILL.md` (Sesión 26) — codifica el flujo completo: contenido contextual por proyecto en vez de genérico, i18n obligatorio en `lib/i18n.tsx` (nunca texto español hardcodeado en componentes del sitio público), reglas para tocar Neon, sincronizar ambas ramas git, y verificar el deployment en Vercel antes de reportar algo como terminado. Después de un cambio de contenido, considerar invocar el agente `.claude/agents/content-consistency-reviewer.md` para verificar que no quedó texto sin traducir o contenido genérico donde debía ser contextual.

### Convenciones de código
- Componentes: PascalCase (`TeamSection.tsx`)
- Funciones/variables: camelCase
- Constantes: UPPER_SNAKE_CASE
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`)

---

**Última actualización:** 2026-09-02 (Sesión 26)
**Versión:** 0.10.5
**Estado:** Sitio público funcional ✅ — Portal PINE (Neon) construido y desplegado ✅ — i18n ES/EN completo en todo el sitio público ✅ — Repo sincronizado con origin ✅
