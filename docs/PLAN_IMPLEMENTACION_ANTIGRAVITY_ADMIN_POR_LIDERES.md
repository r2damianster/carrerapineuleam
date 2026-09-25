# Plan de implementación (handoff a Antigravity): Banco de fotos con topes + administración de la web por los líderes de proyecto

> **Objetivo de fondo:** que la web sea **administrable por los propios líderes**: cada líder/colíder gestiona los datos de **su** proyecto (empezando por las fotos) sin tocar código y sin depender de Arturo. Este documento cubre la **primera entrega** (fotos) y deja la base reutilizable (`lib/permisosProyecto.ts`, namespace `/portal/proyecto/[proyectoId]/…`) para las siguientes (§12).
> Formato y reglas heredan de `docs/PLAN_IMPLEMENTACION_ANTIGRAVITY_INFORMES.md`. Lee ese archivo y `CLAUDE.md` (secciones *Auditoría 2026-09-24*, *Sesión 32*, *Sesión 36*, *Sesión 50*, *Sesión 51*) antes de empezar.
> **Nada de este plan está implementado.** Todo lo que aquí figura como "existe" fue verificado contra Neon (`dark-feather-21824720`) y el código el 2026-09-26.

---

## 0. Alcance y decisiones ya tomadas (confirmadas por el usuario)

1. **Banco de fotos único** = tabla `fotos`. Toda foto que suben los pasantes (eventos, podcasts, asistencia) **entra automáticamente** a ese banco en estado **"sin ubicar"** (`ubicaciones = '{}'`), sin publicarse.
2. **Menores de edad.** Las fotos donde aparecen menores **nunca se publican** en la web. Mecanismo de dos capas: (a) el estudiante **declara** con una casilla *"¿Aparecen menores de edad en la foto?"* (**No** marcado por defecto); (b) **Groq (visión)** revisa la foto como respaldo. Detalle en WP5–WP6.
3. **Las 22 fotos de asistencia ya existentes** van al banco como `visibilidad='interna'` + `menores='revisar'` (bandeja de revisión de un admin). No se publican hasta que un admin las revise.
4. **Podcasts:** la imagen que suben (`evidencia_url`, a veces portada, a veces captura de estadísticas) se acepta **tal cual** como foto del banco (`origen='podcast'`). El usuario dijo que para difusión es indiferente.
5. **Topes por espacio (tope SUAVE):** el admin puede publicar más fotos que el tope, pero el sitio público **solo muestra las N primeras**; el resto sigue en el banco. Topes iniciales (editables sin código): Portada **6**, Club de Inglés **10**, Docencia **8**, RED LEA **10**, galerías nuevas (Internacionalización, Desarrollo de Habilidades, Mentoring) **8**.
6. **Vinculación NO tiene galería propia distinta del Club de Inglés.** La página `/vinculacion/dinamicas-linguisticas` solo muestra `EnglishClubSection` (ubicación `club-ingles`). No crear otra.
7. **Regla automática:** la galería de Docencia Innovadora muestra por defecto las **2 fotos de podcast más recientes** (configurable en `fotos_ubicaciones`, sin código).
8. **Permisos:** la **portada** es solo de administración del sitio (ver D1). **Líder y colíder** de cada proyecto (`proyecto_miembros.rol_en_proyecto IN ('lider','colider')`, `activo`) administran las fotos **de su proyecto**, nada más.
9. **Fotos ya existentes:** las 68 referencias a imágenes locales (`/images/...`) se suben a Cloudinary y se registran en el banco; las que hoy salen en portada/Docencia/RED LEA/Club conservan su ubicación; las demás quedan "sin ubicar".

10. **Cada evento/podcast/QR se asigna a proyectos al subirlo (multi-proyecto).** Quien sube o genera el enlace elige de los proyectos que **le corresponden**; solo administración del sitio (D1) puede asignar cualquiera. Detalle en **WP5b**. Confirmado por el usuario 2026-09-26.

### Decisiones abiertas — el agente NO las resuelve por su cuenta

| # | Tema | Valor por defecto a implementar | Quién confirma |
|---|---|---|---|
| **D1** | "Administración del sitio" = quién puede publicar en portada y ver fotos internas/con menores. El usuario dijo "admin y superadmin". Hoy `/admin/photos` lo usa también Jhonny (`contenido_sitio`). | `puedeAdministrarSitio(sesion)` = `contenido_sitio` **o** `admin` **o** `superadmin` (no quita acceso a nadie). Se define en **una sola función**; si se restringe, se cambia solo ahí. | Arturo |
| **D2** | **RESUELTA (usuario, 2026-09-26): el líder de RED LEA es Jhonny Villafuerte** (`usuarios.id = 13`). Hoy `proyecto_miembros` no tiene a nadie en `redlea`. | **Dato, no código:** Arturo lo asigna en `/admin/members` (rol `lider` en RED LEA); así corre `sincronizarProyectosDePersona` y se recalculan sus módulos. El agente **no** hace `INSERT` a mano en `proyecto_miembros`. ⚠️ Efecto colateral esperado: `redlea.area = 'investigacion'` → `lib/permisosPertenencia.ts` le **deriva el módulo `investigacion`** (verá "Gestionar Investigación" y `/investigacion/*`); hoy Jhonny no tiene ningún módulo. Es consistente con ser colíder del grupo, pero avisar a Arturo. Debe hacerse **antes de la Fase B**. | Arturo |
| **D3** | Nombre exacto del modelo de visión de Groq (cambia con el tiempo). | Variable `GROQ_VISION_MODEL`; el agente verifica en la documentación vigente de Groq y documenta el valor usado. | agente + verificación |
| **D5** | ¿Qué proyectos puede asignar un **pasante** (estudiante-instructor) al subir un evento/podcast? No está modelado (`proyecto_miembros` es de docentes). | Por defecto: **`['vinculacion']`** (y la regla existente de podcasts que añade `internacionalizacion` automáticamente se conserva, exenta de validación por ser añadida por el servidor). Cambiar solo en `proyectosAsignables()`. | Arturo |
| **D4** | Fotos que llegan por **enlace temporal de externos** (`/api/enlaces-difusion/[token]`) no tienen declaración fiable. | Siempre `menores='revisar'`, `visibilidad='interna'` hasta que un admin las revise. | — (regla dura) |

### Datos reales de partida (verificados)

- `fotos`: 45 filas (`redlea-galeria` 13 activas + 2 inactivas, `club-ingles` 3, `portada` 3 activas + 1 inactiva, `docencia-galeria` 23 con `origen='evidencia_evento'`). Columnas actuales: `id text PK, url, cloudinary_public_id, titulo, descripcion, ubicaciones text[] NOT NULL DEFAULT '{}', "order" int, activo bool, subido_por text (email), origen text, created, updated, posicion int 0-100`. CHECK `fotos_origen_check IN ('admin','evidencia_evento')`, `fotos_posicion_check`.
- `proyectos.id` reales: `internacionalizacion`, `vinculacion`, `docencia_innovadora`, `redlea`, `desarrollo_habilidades`, `mentoring`. (`slug` de Vinculación es `dinamicas-linguisticas`; de Internacionalización `proyecto-innovacion`.)
- Líder/colíder activos hoy: `desarrollo_habilidades` → Germán Carrera (lider, id 19) + María Cristina Basantes (colider, id 14); `docencia_innovadora` → Verónica Chávez (lider, id 20); `mentoring` → Verónica Chávez (lider); `internacionalizacion` → Arturo Rodríguez (lider, id 1) + Jhonny Villafuerte (colider, id 13); `vinculacion` → Cintya Zambrano (lider, id 8); `redlea` → **nadie hoy; será Jhonny Villafuerte (D2)**.
- `actividades_difusion`: `project_id` y `proyecto` están **vacíos en todas las filas actuales** → los eventos históricos no traen proyecto; quedarán con `proyectos = '{}'` (sin proyecto) salvo los ya ubicados y las filas con `categoria = 'vinculacion'` (→ `['vinculacion']`, ver WP7). El campo `proyecto` (texto) lo consumen los informes: **no tocarlo**.
- `asistencia_espacio`: 22 filas con `foto_url`. `espacios_enseñanza.area` es siempre `vinculacion` (12 espacios).
- Referencias de imagen: 26 en Cloudinary, 68 locales (`/images/...`; `public/images` tiene solo 16 archivos, 20 MB → hay **muchas repeticiones**: subir cada archivo local **una sola vez**).
- Cada `route.ts` es una función serverless de Vercel (cuota ≈300 por deploy). Este plan agrega **3** rutas nuevas y extiende 3 existentes. No agregar más.

---

## 1. Reglas de oro (no negociables — repiten los errores ya documentados)

1. **Rama de trabajo:** `git checkout -b feat/admin-lideres-fotos` **antes de tocar nada**. Verificar `git branch --show-current` al iniciar cada sesión. Un hook de auto-commit sube a `main` lo que encuentre en el árbol: **no trabajar en `main`**. (Ya causó deploys en ERROR: marcas de conflicto y archivos de 0 bytes.)
2. `git commit` **falla desde la herramienta Bash** de este entorno Windows ("El sistema no puede encontrar el archivo especificado"); usar **PowerShell**.
3. Antes de cada push con `.ts/.tsx`: `npx tsc --noEmit` **y** `npm run build` pasan local. `grep -rn "<<<<<<<" app lib components` = 0. `find app lib components -size 0 -type f` = vacío (un archivo nuevo nunca se commitea vacío).
4. **`neon()` nunca a nivel de módulo.** Los helpers de `lib/` reciben `sql` desde el handler. En GET públicos sin sesión: `neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } })` + `export const dynamic = 'force-dynamic'`.
5. **Migraciones a mano** en `scripts/migrate-*.js` (plantilla: `scripts/migrate-topes-horas.js`). **Nunca** `prisma db push` / `prisma migrate`. **Auditar `information_schema` antes y verificar con SELECT después.** Usar **solo** los nombres de columna de este documento: no adivinar (errores previos: `ciclos_academicos.activo` no existe; `asistencia_espacio_id` no existe, la columna es `asistencia_id`).
6. **Todo valor nuevo de un CHECK/enum se migra en el mismo cambio** y se prueba el flujo real (lección "Ver como"). `tsc`/`build` no detectan constraints de Postgres.
7. **`middleware.ts` excluye `/api` del matcher**: cada `route.ts` debe validar sesión **dentro del handler** (`getAppSessionFromCookies()`), **rechazar `rol === 'secretaria'`**, y validar permisos con los helpers de este plan. Toda página nueva bajo `/portal/proyecto` se agrega a `protectedRoutes` (WP9).
8. **La cookie de sesión puede estar desfasada** (los módulos viajan firmados dentro de ella): los permisos por proyecto se consultan **en Neon en cada petición**, nunca solo con la cookie. Bajo "Ver como" la cookie ya trae la identidad suplantada: usar `session.id`/`session.email` tal cual, nunca `impersonatedBy`.
9. **Nada de datos inventados** (personas, correos, proyectos). Si falta un dato, se deja `NULL` o se pregunta.
10. Nombres descriptivos (nada de `s`, `i`, `val`, `tmp`, `cb`). Estado de formularios React: releer el objeto completo tras pegar bloques (claves duplicadas rompieron un build). Texto visible del **sitio público** con `t('clave')` en `lib/i18n.tsx` (ES+EN); el portal/admin va en español fijo como el resto.
11. Toda función que deje algo pendiente agrega su regla en `lib/notificaciones.ts` + fila en `NOTIFICACIONES.md` (WP10).
12. Tras push: `list_deployments` de Vercel (proyecto `carrerapineuleam`, `prj_FzfL9E6xk7TUi5AkMQ5njDnNQAH7`, team `team_bfWYT0VBtmA1Dj9nL7242ZJL`) debe dar `READY`; si `ERROR`, leer `list_deployment_events` y corregir **antes** de seguir.
13. **No commitear ni pushear sin instrucción del usuario.** Un PR por fase.
14. Antes de editar un archivo compartido (`middleware.ts`, `app/portal/dashboard/page.tsx`, `lib/notificaciones.ts`, `app/api/difusion/route.ts`): **leerlo completo**; otra sesión (Claude) lo pudo cambiar. Cambios mínimos y quirúrgicos; no reformatear ni reordenar.

---

## 2. Orden de trabajo

| WP | Contenido | Depende de | Fase |
|---|---|---|---|
| WP0 | Preparación y auditoría | — | A |
| WP1 | Migración de BD (`fotos` + `fotos_ubicaciones`) | WP0 | A |
| WP2 | Capa de datos y permisos (`lib/`) | WP1 | A |
| WP3 | API pública con topes + regla automática | WP2 | A |
| WP4 | API de administración (banco, acciones, ubicaciones) | WP2 | A |
| WP5 | Declaración de menores + ingesta (asistencia, eventos, podcasts, externos) | WP1, WP2, WP5b | A |
| WP5b | **Asignación de proyectos al subir** (eventos, podcasts, enlaces QR) | WP1, WP2 | A |
| WP6 | Groq visión (respaldo de menores) | WP5 | A |
| WP7 | Backfill: Cloudinary + registro de lo existente | WP1, WP5, WP5b | A |
| WP8 | UI: `/admin/photos` reescrito (componente compartido) | WP3, WP4 | A |
| WP9 | Panel del líder `/portal/proyecto/...` + galerías nuevas en páginas de proyecto | WP4, WP8 | B |
| WP10 | Notificaciones | WP4 | B |
| WP11 | Pruebas de permisos, documentación, despliegue | todo | cada fase |

**Fase A = WP0–WP8 (incl. WP5b)** (resuelve la sobrepoblación y los menores; desplegable sola). **Fase B = WP9–WP10** (líderes). WP11 en cada fase.

---

## WP0 — Preparación y auditoría (solo lectura)

1. `git fetch`; `git log origin/main..HEAD`; crear la rama (regla 1).
2. Auditoría BD (Neon MCP, `run_sql`, **una sentencia por llamada**): `information_schema.columns` de `fotos`, `proyectos`, `proyecto_miembros`, `asistencia_espacio`, `actividades_difusion`, `videos`; `pg_constraint` de `fotos`; confirmar que **no existen** aún `fotos_ubicaciones` ni las columnas nuevas de WP1. Si algo difiere de la sección "Datos reales", **detenerse y reportar**.
3. Listar líderes/colíderes reales: `SELECT pm.proyecto_id, pm.rol_en_proyecto, u.id, u.nombres, u.apellidos FROM proyecto_miembros pm JOIN usuarios u ON u.id = pm.usuario_id WHERE pm.activo AND pm.rol_en_proyecto IN ('lider','colider')`. Contrastar con la tabla de §0 (esperado: RED LEA vacío → D2).
4. `SELECT DISTINCT ubicaciones FROM fotos` → todos los slugs usados deben existir en el seed de WP1 (esperado: `portada`, `docencia-galeria`, `redlea-galeria`, `club-ingles`).
5. Inventario de imágenes: `SELECT DISTINCT` de rutas locales en `fotos.url`, `actividades_difusion.photos` (unnest), `actividades_difusion.evidencia_url`; comprobar con `fs.existsSync` cuáles existen en `public/`. Guardar el conteo real de **archivos distintos** (insumo de WP7).
6. Leer completos antes de editar: `middleware.ts`, `lib/session.ts`, `lib/modulos.ts`, `lib/equipoProyecto.ts`, `lib/notificaciones.ts`, `NOTIFICACIONES.md`, `app/admin/photos/page.tsx`, `app/api/photos/route.ts`, `app/api/photos/[id]/route.ts`, `app/api/upload/route.ts`, `app/api/difusion/route.ts`, `app/api/espacios/asistencia/route.ts`, `app/api/enlaces-difusion/[token]/route.ts`, `app/api/proyectos/route.ts`, `app/portal/dashboard/page.tsx`, `lib/groqAudio.ts` (patrón de llamada a Groq), `.claude/skills/carrerapine-workflow/SKILL.md`.

---

## WP1 — Migración de BD

Archivo: `scripts/migrate-fotos-banco.js` (ejecutar con `node --env-file=.env.local scripts/migrate-fotos-banco.js`; aplicar también en Neon vía MCP, proyecto `dark-feather-21824720`). **Idempotente** (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`). Orden obligatorio:

```sql
-- 0. Respaldo (patrón usado antes en este repo)
CREATE TABLE IF NOT EXISTS respaldo_fotos_20260926 AS SELECT * FROM fotos;

-- 1. Columnas nuevas (aditivas: el código actual sigue funcionando)
ALTER TABLE fotos
  ADD COLUMN IF NOT EXISTS proyectos       text[]  NOT NULL DEFAULT '{}',   -- ids de proyectos a los que pertenece la foto (multi-proyecto; sin FK: se valida en la app)
  ADD COLUMN IF NOT EXISTS fuente_id       text,
  ADD COLUMN IF NOT EXISTS fecha_evento    date,
  ADD COLUMN IF NOT EXISTS categoria       text,
  ADD COLUMN IF NOT EXISTS subido_por_id   integer REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS menores         text    NOT NULL DEFAULT 'no',
  ADD COLUMN IF NOT EXISTS visibilidad     text    NOT NULL DEFAULT 'publicable',
  ADD COLUMN IF NOT EXISTS ia_resultado    jsonb;

-- 2. CHECKs (origen se AMPLÍA; no crear una columna paralela)
ALTER TABLE fotos DROP CONSTRAINT IF EXISTS fotos_origen_check;
ALTER TABLE fotos ADD CONSTRAINT fotos_origen_check
  CHECK (origen IN ('admin','evidencia_evento','evento','podcast','asistencia','lider'));
ALTER TABLE fotos ADD CONSTRAINT fotos_menores_check     CHECK (menores IN ('no','si','revisar'));
ALTER TABLE fotos ADD CONSTRAINT fotos_visibilidad_check CHECK (visibilidad IN ('publicable','interna'));
-- Guardia de última línea: una foto con menores / interna NO puede tener ubicaciones públicas.
ALTER TABLE fotos ADD CONSTRAINT fotos_publicable_sin_menores
  CHECK ((menores = 'no' AND visibilidad = 'publicable') OR cardinality(ubicaciones) = 0) NOT VALID;
ALTER TABLE fotos VALIDATE CONSTRAINT fotos_publicable_sin_menores;  -- falla si hay filas que la violan: no forzar, reportar

-- 3. Idempotencia de la ingesta (una foto de una fuente no se duplica)
CREATE UNIQUE INDEX IF NOT EXISTS fotos_fuente_unica ON fotos (origen, fuente_id, url) WHERE fuente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS fotos_ubicaciones_gin ON fotos USING gin (ubicaciones);
CREATE INDEX IF NOT EXISTS fotos_proyectos_gin   ON fotos USING gin (proyectos);
CREATE INDEX IF NOT EXISTS fotos_origen_idx      ON fotos (origen, created DESC);

-- 4. Catálogo de ubicaciones con tope
CREATE TABLE IF NOT EXISTS fotos_ubicaciones (
  slug           text PRIMARY KEY,
  nombre         text    NOT NULL,
  proyecto_id    text    REFERENCES proyectos(id) ON DELETE CASCADE,   -- NULL = global (portada)
  max_fotos      integer NOT NULL CHECK (max_fotos BETWEEN 1 AND 50),
  solo_admin     boolean NOT NULL DEFAULT false,
  auto_origen    text    CHECK (auto_origen IN ('podcast','evento')),  -- relleno automático (opcional)
  auto_cantidad  integer NOT NULL DEFAULT 0 CHECK (auto_cantidad >= 0),
  orden          integer NOT NULL DEFAULT 0,
  activo         boolean NOT NULL DEFAULT true,
  CHECK (auto_cantidad <= max_fotos),
  CHECK (proyecto_id IS NOT NULL OR solo_admin)                        -- una ubicación global exige admin
);
```

Seed (`INSERT ... ON CONFLICT (slug) DO NOTHING`):

| slug | nombre | proyecto_id | max_fotos | solo_admin | auto_origen | auto_cantidad |
|---|---|---|---|---|---|---|
| `portada` | Portada del sitio | NULL | 6 | true | — | 0 |
| `club-ingles` | Club de Inglés (Vinculación) | `vinculacion` | 10 | false | — | 0 |
| `docencia-galeria` | Galería de Docencia Innovadora | `docencia_innovadora` | 8 | false | `podcast` | 2 |
| `redlea-galeria` | Galería RED LEA | `redlea` | 10 | false | — | 0 |
| `internacionalizacion-galeria` | Galería de Internacionalización | `internacionalizacion` | 8 | false | — | 0 |
| `desarrollo-habilidades-galeria` | Galería de Desarrollo de Habilidades | `desarrollo_habilidades` | 8 | false | — | 0 |
| `mentoring-galeria` | Galería de Mentoring | `mentoring` | 8 | false | — | 0 |

Backfill de `proyectos` en las 45 filas existentes (después del seed):
`UPDATE fotos f SET proyectos = ARRAY[u.proyecto_id] FROM fotos_ubicaciones u WHERE cardinality(f.proyectos) = 0 AND u.slug = f.ubicaciones[1] AND u.proyecto_id IS NOT NULL;` (las de `portada` quedan `'{}'`).

Más columnas de WP5b (misma migración, `IF NOT EXISTS`): `ALTER TABLE actividades_difusion ADD COLUMN IF NOT EXISTS proyectos text[] NOT NULL DEFAULT '{}';` y `ALTER TABLE enlaces_difusion ADD COLUMN IF NOT EXISTS proyectos text[] NOT NULL DEFAULT '{}';`. **No** modificar `actividades_difusion.project_id` ni `proyecto`.

**Verificación obligatoria (SELECT, pegar el resultado en el PR):** columnas nuevas presentes; 7 filas en `fotos_ubicaciones`; `SELECT count(*) FROM fotos` = 45 (sin pérdida); `SELECT count(*) FROM fotos WHERE cardinality(ubicaciones)>0 AND (menores<>'no' OR visibilidad<>'publicable')` = 0.

**Rollback** (documentar en el script, comentado): `DROP TABLE fotos_ubicaciones; ALTER TABLE fotos DROP COLUMN ...` (las 8) y restaurar el CHECK original; el respaldo `respaldo_fotos_20260926` permite recuperar.

**Efecto visible al desplegar los topes (avisar al usuario):** Docencia hoy muestra 23 fotos y pasará a 8 (6 manuales + 2 podcast automáticas); RED LEA 13 → 10. Las demás siguen en el banco. Tras el deploy el admin debe **curar** cuáles son las 6/10 (campo `order`, WP8).

---

## WP2 — Capa de datos y permisos (`lib/`)

### `lib/permisosProyecto.ts` (nuevo — base de toda la administración por líderes)

Sin imports de Node/Neon a nivel de módulo; recibe `sql` del handler. Exporta:

```ts
import type { AppSession } from './session';

export const ROLES_GESTORES_PROYECTO = ['lider', 'colider'] as const;

// D1: única definición de "administración del sitio". Cambiar aquí si se restringe.
export function puedeAdministrarSitio(usuario: Pick<AppSession, 'modulos_acceso'> | null | undefined): boolean {
  const modulos = usuario?.modulos_acceso ?? [];
  return modulos.includes('contenido_sitio') || modulos.includes('admin') || modulos.includes('superadmin');
}

export interface ProyectoGestionable { id: string; nombre_oficial: string; slug: string | null; rolEnProyecto: 'admin_sitio' | 'lider' | 'colider'; }

// Proyectos que la persona puede gestionar. Admin de sitio → todos los activos; docente → solo donde es lider/colider ACTIVO.
export async function proyectosGestionables(sql: any, usuario: AppSession): Promise<ProyectoGestionable[]>;

export async function puedeGestionarProyecto(sql: any, usuario: AppSession, proyectoId: string): Promise<boolean>;
```

Reglas de implementación:
- Solo docentes: `usuario.rol` ∈ `profesor|admin` (usar `esDocente` de `lib/modulos.ts`). **Estudiante, beneficiario y secretaria → siempre `false`** (aunque figuren en `proyecto_miembros`).
- `usuarioId = Number(usuario.id)` (`AppSession.id` es `string`). Si `Number.isNaN` → `false`.
- Consulta: `SELECT 1 FROM proyecto_miembros WHERE proyecto_id = ${proyectoId} AND usuario_id = ${usuarioId} AND activo AND rol_en_proyecto IN ('lider','colider')`.
- **No** crear un módulo nuevo en `usuarios.modulos_acceso` ni tocar `lib/permisosPertenencia.ts`: la pertenencia se consulta en vivo (evita el desfase de cookie).

### `lib/fotosPublicas.ts` (nuevo)

`obtenerFotosDeUbicacion(sql, slug)`: devuelve el arreglo final que ve el público, **ya con tope y relleno automático**. Reglas exactas:

1. Leer `fotos_ubicaciones` por `slug` con `activo`. Si no existe → **`[]`** (una ubicación desconocida no publica nada).
2. `cupoManual = max_fotos - auto_cantidad`.
3. **Manuales:** `SELECT * FROM fotos WHERE activo AND visibilidad='publicable' AND menores='no' AND ${slug} = ANY(ubicaciones) AND <gate> ORDER BY "order" ASC, created DESC LIMIT cupoManual`.
4. **Automáticas** (si `auto_origen` y `auto_cantidad > 0`): `SELECT * FROM fotos WHERE origen = auto_origen AND activo AND visibilidad='publicable' AND menores='no' AND id NOT IN (manuales) AND <gate> ORDER BY fecha_evento DESC NULLS LAST, created DESC LIMIT auto_cantidad`.
5. Resultado = manuales ++ automáticas (nunca más de `max_fotos`).
6. **`<gate>` (fuente aprobada)** — un helper SQL reutilizable, fragmento único:
   `(origen IN ('admin','evidencia_evento','lider') OR (origen IN ('evento','podcast') AND EXISTS (SELECT 1 FROM actividades_difusion a WHERE a.id::text = fotos.fuente_id AND a.aprobado_sitio = true)) OR (origen = 'asistencia' AND EXISTS (SELECT 1 FROM asistencia_espacio s WHERE s.id::text = fotos.fuente_id AND s.estado_aprobacion = 'aprobado')))`
   Una foto de un evento no aprobado o de una asistencia no aprobada **jamás** sale en la web.

También exportar `fragmentoFuenteAprobada` para reutilizarlo en el listado del admin (WP4).

### `lib/cloudinaryUrl.ts` (nuevo, puro)

`miniaturaCloudinary(url, ancho = 400)`: si `url` contiene `/upload/` inserta `w_${ancho},c_fill,q_auto,f_auto/` justo después; si no, devuelve `url` sin cambios (rutas locales o externas). Nunca lanza.

### `lib/groqVision.ts` (nuevo) — ver WP6.

---

## WP3 — API pública con topes

Archivo existente: `app/api/photos/route.ts`. **Solo cambia el `GET`** (el `POST` se toca en WP4).

- Mantener: `neon(..., { fetchOptions: { cache: 'no-store' } })`, `export const dynamic = 'force-dynamic'`.
- `GET ?ubicacion=X` (sin `all`) → `return NextResponse.json(await obtenerFotosDeUbicacion(sql, X))`. **Misma forma de respuesta** (arreglo de filas de `fotos`) → `PhotoCarousel`, `ActivityGallery`, `EnglishClubSection`, `RedLEAGaleria` **no se modifican** y ganan los topes solos.
- `GET ?all=true`: **deja de ser público**. Hoy lo usa `/admin/photos`; pasa a exigir sesión + `puedeAdministrarSitio` y se reemplaza por `/api/photos/banco` (WP4). Buscar con `grep -rn "photos?all" app components` y migrar cada llamador **en el mismo cambio**; si queda alguno, el admin se rompe.
- `GET` sin `ubicacion` y sin `all` → `[]` (ya no volcar toda la tabla al público).
- Los 4 componentes públicos deben **ocultar su sección si la lista viene vacía** (verificar; si alguno muestra un título vacío, arreglarlo con el cambio mínimo).

---

## WP4 — API de administración (3 rutas nuevas + 2 extendidas)

Todas: `getAppSessionFromCookies()` → 401 si no hay; 403 si `!esDocente(sesion)` (esto rechaza secretaria/estudiante); `export const dynamic = 'force-dynamic'`; `neon()` dentro del handler; errores de constraint (`error.code === '23514'`) → **409** con mensaje claro, no 500.

### 4.1 `GET /api/photos/banco` — `app/api/photos/banco/route.ts` (nueva)

Listado con filtros y paginación. Parámetros (todos opcionales; **validar y acotar**, nunca interpolar): `q` (título/descripcion, `ILIKE` parametrizado), `origen` (uno de los 6 valores), `ubicacion` (slug o `sin_ubicar`), `proyecto` (id o `sin_proyecto` = `cardinality(proyectos)=0`), `desde`/`hasta` (fecha sobre `COALESCE(fecha_evento, created::date)`), `menores` (`no|si|revisar`), `estado` (`publicada|sin_ubicar|oculta`), `page` (≥1), `pageSize` (1–60, por defecto 24). Respuesta: `{ items, total, page, pageSize }`. Cada item incluye `miniatura` (`miniaturaCloudinary`).

**Alcance por rol (crítico para privacidad):**
- `puedeAdministrarSitio` → ve todo, incluido `visibilidad='interna'` y `menores≠'no'` (bandeja de revisión).
- Líder/colíder → agregar `AND proyectos && ${idsDeMisProyectos}::text[] AND visibilidad='publicable' AND menores='no' AND <fragmentoFuenteAprobada>` (`&&` = solapamiento de arreglos). **Nunca** ve fotos internas ni con menores ni de proyectos ajenos ni con `proyectos` vacío.
- Docente sin proyectos → `{ items: [], total: 0 }` (no 403).
- Si `proyecto` pedido no está en sus proyectos → `[]` (no revelar existencia).

Las fotos de `origen IN ('evento','podcast','asistencia')` aparecen **solo si su fuente está aprobada** (mismo `<gate>`), excepto para administración del sitio, que las ve todas con una insignia "fuente sin aprobar".

### 4.2 `POST /api/photos/accion` — `app/api/photos/accion/route.ts` (nueva)

Acciones en lote. Cuerpo: `{ ids: string[] (1–100, únicos), accion, ubicaciones?: string[] }`.

| `accion` | Efecto | Requiere |
|---|---|---|
| `publicar` | Agrega `ubicaciones` (union, sin duplicar) y pone `activo = true` | ver matriz |
| `quitar` | Quita `ubicaciones` de la foto | ver matriz |
| `ocultar` / `mostrar` | `activo = false/true` (sin tocar ubicaciones) | ver matriz |
| `descartar` | `activo = false` y `ubicaciones = '{}'` (sale del sitio; queda en el banco, **no** borra Cloudinary) | ver matriz |
| `marcar_revisada` | Admin: `menores='no'`, `visibilidad='publicable'` | solo `puedeAdministrarSitio` |
| `marcar_interna` | Admin: `menores='si'`, `visibilidad='interna'`, `ubicaciones='{}'`, `activo=false` | solo `puedeAdministrarSitio` |

**Matriz de autorización por foto × ubicación** (implementar como función pura `evaluarAcceso(...)` testeable, en `lib/permisosProyecto.ts` o `lib/fotosPublicas.ts`):

1. Cargar `fotos_ubicaciones` de las `ubicaciones` pedidas; si alguna no existe o `!activo` → 400.
2. `publicar`: **rechazar (409)** si la foto tiene `menores≠'no'` o `visibilidad≠'publicable'` (mensaje: "Foto con menores o interna: no se puede publicar"). Rechazar si su fuente no está aprobada (`<gate>` falso).
3. Ubicación `solo_admin` (portada) → solo `puedeAdministrarSitio`; si no → 403 **para todo el lote** (falla atómica, ver 5).
4. Ubicación con `proyecto_id = P` (columna de `fotos_ubicaciones`) → `puedeAdministrarSitio` **o** (`puedeGestionarProyecto(P)` **y** `P ∈ foto.proyectos`).
5. El líder solo puede operar fotos cuyo arreglo `proyectos` solape con los suyos. Una foto etiquetada `[A,B]` la puede publicar el líder de A en ubicaciones de A (no en las de B salvo que también gestione B). Publicar en una ubicación de un proyecto que no gestiona → 403. Un líder no puede tocar fotos con `proyectos` vacío.
6. `quitar` por líder: solo quita ubicaciones que él gestiona; las ajenas de la misma foto se conservan.

**Atomicidad:** validar **todas** las fotos y ubicaciones primero; si una falla, no se modifica ninguna (responder `{ error, detalle: [{id, motivo}] }`). Ejecutar los `UPDATE` dentro de una transacción (`Pool` + `BEGIN/COMMIT`, patrón de `app/api/espacios/asistencia/route.ts`) o en una sola sentencia `UPDATE ... WHERE id = ANY(...)`. Nunca un bucle de updates sin transacción.

**Respuesta** incluye `avisos` (tope suave): para cada ubicación publicada → `{ slug, publicadas, max_fotos }` con `publicadas` = fotos activas y publicables en esa ubicación tras la operación; la UI muestra "Hay N fotos, el sitio mostrará solo las M primeras" si `publicadas > max_fotos`. **No se rechaza** por tope (decisión: suave).

### 4.3 `GET | PATCH /api/photos/ubicaciones` — `app/api/photos/ubicaciones/route.ts` (nueva)

- `GET`: `{ proyectos: ProyectoGestionable[], ubicaciones: [{ slug, nombre, proyecto_id, max_fotos, solo_admin, auto_origen, auto_cantidad, publicadas }] }` filtrado por alcance (admin → todas; líder → solo ubicaciones de sus proyectos, sin las `solo_admin`). Reemplaza la necesidad de un endpoint "mis proyectos".
- `PATCH { slug, max_fotos?, auto_origen?, auto_cantidad?, activo? }`: **solo `puedeAdministrarSitio`**. Validar `max_fotos` 1–50 y `auto_cantidad ≤ max_fotos`. Los líderes **no** editan topes.

### 4.4 Extender `POST /api/photos` (crear) y `PATCH /api/photos/[id]`

- `POST` hoy exige `contenido_sitio`. Nuevo: `puedeAdministrarSitio` **o** líder con `proyectos` (cuerpo, arreglo) ⊆ sus proyectos. El líder **debe** enviar `proyectos` (≥1) y solo `ubicaciones` de esos proyectos; el servidor **ignora** cualquier `origen`/`menores`/`visibilidad` que envíe el cliente: fuerza `origen='lider'` (o `'admin'` si es admin), `menores='no'`, `visibilidad='publicable'`, `subido_por` = email de sesión, `subido_por_id = Number(sesion.id)`. Si el cliente declara `hay_menores = true` → guardar `menores='si'`, `visibilidad='interna'`, `ubicaciones=[]`, `activo=false`. Pasar la foto por Groq (WP6) antes de aceptarla como `no`.
- `PATCH /api/photos/[id]`: conserva el atajo de un solo campo `activo`; agrega edición de `titulo`, `descripcion`, `posicion` (0–100), `order`, y —solo admin— `proyectos` (reasignar). Autorización por foto igual que 4.2.
- `DELETE /api/photos/[id]`: **sigue solo `puedeAdministrarSitio`** (borra en Cloudinary). Los líderes usan `descartar`.

---

## WP5 — Declaración de menores e ingesta al banco

**Regla común de ingesta** (helper `lib/ingestaFotos.ts`, función `registrarFotoEnBanco(sql, datos)`): inserta con `ON CONFLICT (origen, fuente_id, url) WHERE fuente_id IS NOT NULL DO NOTHING`; valores por defecto: `activo = true`, `ubicaciones = '{}'` (sin ubicar), `posicion = 50`, `"order" = 0`. Si `hayMenores` → `menores='si'`, `visibilidad='interna'`, `activo=false`. Si es externo (D4) → `menores='revisar'`, `visibilidad='interna'`. **Una falla de ingesta jamás debe hacer fallar el registro principal** (asistencia/evento): envolver en `try/catch`, registrar `console.error` y continuar.

### 5.1 Asistencia — `app/api/espacios/asistencia/route.ts`

- Cuerpo nuevo: `hay_menores: boolean` (si falta → `false`). El formulario (`app/vinculacion/asistencia/page.tsx`) agrega la casilla **"¿Aparecen menores de edad en la foto?"** (No por defecto, con texto de ayuda: "Si marcas Sí, la foto solo la verá el supervisor y no se publicará").
- El handler ya usa transacción (`INSERT INTO asistencia_espacio ... foto_url, foto_public_id`). Obtener el `id` con `RETURNING id` y llamar a `registrarFotoEnBanco` **después del `COMMIT`** con: `origen='asistencia'`, `fuente_id = String(idAsistencia)`, `url = foto_url`, `cloudinary_public_id = foto_public_id`, `subido_por_id = Number(usuario.id)`, `fecha_evento = fecha`, `proyectos = ARRAY['vinculacion']` (todos los espacios son `area='vinculacion'`; en asistencia el proyecto es fijo, no se elige).
- No se altera el flujo de aprobación de asistencia. El `<gate>` (WP2) impide publicar hasta que el supervisor apruebe.
- **No** agregar columna `hay_menores` a `asistencia_espacio` (la verdad vive en `fotos.menores`).

### 5.2 Eventos y podcasts — `app/api/difusion/route.ts`

- Hoy hace `INSERT INTO actividades_difusion ...` **sin** `RETURNING id`. Agregar `RETURNING id`.
- Cuerpo nuevo: `hay_menores: boolean` (default `false`). Casilla en `/vinculacion/difusion`, `/gestion-carrera` y `/vinculacion/publico-difusion/[token]` (mismo texto que 5.1).
- Después del insert: si hay `evidencia_url`:
  - `tipo = 'podcast'` → `origen='podcast'`; **conservar** la línea `const photos = evidencia_url && tipo !== 'podcast' ? [...] : []` (NewsSection depende de ella; no tocar).
  - otros tipos → `origen='evento'`.
  - `fuente_id = String(id)`, `fecha_evento = fecha`, `categoria = categoria`, `subido_por_id = registrador_id`.
  - `proyectos`: **copiar los `proyectos` ya validados de la actividad** (WP5b). No recalcular ni adivinar.

### 5.3 Enlaces temporales de externos — `app/api/enlaces-difusion/[token]/route.ts` (POST)

Misma ingesta que 5.2 pero **siempre** `menores='revisar'`, `visibilidad='interna'` (D4), `subido_por_id = NULL`.

### 5.4 Subida directa del líder/admin
Cubierta en 4.4 (`POST /api/photos`).

---

## WP5b — Asignación de proyectos al subir (eventos, podcasts, enlaces QR)

**Regla del usuario:** al subir un evento o podcast **se debe escoger a qué proyecto(s) pertenece**; los proyectos elegibles dependen de **quién lo sube o quién genera el QR**; solo administración del sitio (D1) puede asignar cualquier proyecto.

### 5b.1 Quién puede asignar qué — `proyectosAsignables(sql, usuario)` en `lib/permisosProyecto.ts`

| Quién | Proyectos que puede asignar |
|---|---|
| Administración del sitio (`puedeAdministrarSitio`) | **Todos** los `proyectos.activo = true` |
| Docente (`rol` `profesor`/`admin`) | Solo los de `proyecto_miembros` donde **está activo, con cualquier rol** (líder, colíder, supervisor, vinculación, participante). Quien no es miembro de ninguno → lista vacía |
| Estudiante-instructor (pasante) | D5: por defecto `['vinculacion']` si es instructor de algún espacio (`espacio_instructores`) |
| Secretaria / beneficiario | Ninguno (403 en las APIs) |
| **Externo con enlace temporal** | **No elige**: usa los `proyectos` fijados por quien generó el enlace |

Devuelve `{ id, nombre_oficial }[]`. Misma disciplina que WP2: consulta en Neon en cada petición, `Number(usuario.id)`, `sql` inyectado.

### 5b.2 Migración (ya incluida en WP1)
`actividades_difusion.proyectos text[]` y `enlaces_difusion.proyectos text[]` (NOT NULL DEFAULT `'{}'`). **No** tocar `project_id` ni `proyecto` (los informes leen `proyecto`).

### 5b.3 API
- **`GET /api/proyectos?asignables=1`** — se agrega al `route.ts` existente (**no crear ruta nueva**). Exige sesión; devuelve `proyectosAsignables`. Leer el `GET` actual completo: hoy sirve el nav público y `?all=true`; el nuevo parámetro es una rama **antes** de los demás y **no altera** su comportamiento público.
- **Validación en el servidor (obligatoria; el cliente no es confiable)** — una sola función `validarProyectosAsignables(sql, usuario, proyectosPedidos)`: ≥1 proyecto, sin repetidos, todos existen y están activos, y `⊆ proyectosAsignables(usuario)`. Fallo → **400** (vacío/inexistente) o **403** ("No puedes asignar el proyecto X"). Se aplica en:
  - `POST /api/difusion` → guarda en `actividades_difusion.proyectos` (columna nueva) **y** sigue escribiendo `proyecto`/`categoria` como hoy.
  - `POST /api/videos` y `lib/registrarVideoPropuesto.ts` → los proyectos que **elige el usuario** se validan; la regla vigente (Sesión 38) que **añade `internacionalizacion` automáticamente** a `videos.proyecto_id[]` la agrega el servidor y **no** se valida contra los asignables.
  - `POST /api/enlaces-difusion` (generar QR) → requiere `proyectos` (≥1, validados contra los asignables **del generador**); se guardan en `enlaces_difusion.proyectos`.
  - `POST /api/enlaces-difusion/[token]` (público, externo) → **ignora cualquier `proyectos` del cuerpo** y usa los del enlace; los copia a `actividades_difusion.proyectos`.
  - `POST /api/espacios/asistencia` → no elige (fijo `['vinculacion']`).
- Administración del sitio pasa la validación con cualquier proyecto activo (no hay atajo distinto: `proyectosAsignables` ya devuelve todos).

### 5b.4 UI
- Componente nuevo **`components/SelectorProyectosEvento.tsx`**: checklist multi-selección alimentada por `GET /api/proyectos?asignables=1`; obligatorio ≥1; si solo hay uno, aparece marcado y bloqueado con la etiqueta; si hay cero, mensaje "No perteneces a ningún proyecto: pide a un administrador que te asigne" y **botón de envío deshabilitado**. Español fijo (portal).
- Usarlo en: `/vinculacion/difusion`, `/gestion-carrera`, `components/EnlaceDifusionModal.tsx` (al generar el QR) y `/portal/subir-video`. En los formularios de **podcast** que ya usan `SelectorAreaProyectoPodcast`, convivir: el selector de área/proyecto existente define el proyecto principal del podcast; este componente **no lo reemplaza**, lo complementa solo donde el formulario no tenía selección (eventos). Leer ambos formularios completos antes de tocarlos y **no duplicar claves en el `useState`**.
- `/vinculacion/publico-difusion/[token]`: **sin selector** (los proyectos ya vienen del enlace); mostrar en modo lectura "Este registro se asociará a: …".

### 5b.5 Efecto en fotos
La ingesta (WP5.2/5.3) copia `actividades_difusion.proyectos` a `fotos.proyectos`. Es lo que permite que el líder vea en su banco las fotos de eventos de su proyecto.

### 5b.6 Datos históricos
`actividades_difusion.proyectos = '{}'` salvo las filas con `categoria = 'vinculacion'` (→ `['vinculacion']`). Las demás quedan "sin proyecto": solo administración las ve y las asigna desde el modal de edición (WP8).

---

## WP6 — Groq visión (respaldo, nunca decisión única)

Archivo `lib/groqVision.ts` (mismo estilo que `lib/groqAudio.ts`: `GROQ_API_KEY`, `fetch`, errores tipados):

```ts
export type VeredictoMenores = 'no' | 'si' | 'dudoso';
export async function analizarMenoresEnFoto(urlImagen: string): Promise<{ veredicto: VeredictoMenores; personas: number } | null>;
```

- Endpoint: `https://api.groq.com/openai/v1/chat/completions`, modelo `process.env.GROQ_VISION_MODEL` (D3: verificar el nombre vigente en la doc de Groq; no inventarlo), `response_format: { type: 'json_object' }`, `temperature: 0`, `AbortController` con **timeout 10 s**.
- Enviar la imagen **reducida**: `urlImagen` con transformación `w_800,q_auto` (Cloudinary). No enviar nombres ni metadatos de personas.
- Prompt fijo (en español, en una constante): pedir **solo** JSON `{"veredicto":"no|si|dudoso","personas":<entero>}` sobre si en la imagen aparecen personas que parezcan menores de 18 años; ante duda, `dudoso`.
- **Nunca lanza hacia el llamador:** timeout, error HTTP, JSON inválido o `GROQ_API_KEY` ausente → devuelve `null`.
- Uso (dentro de `registrarFotoEnBanco`, después de insertar, en segundo plano dentro del mismo request con `await` acotado por el timeout): guardar el resultado en `ia_resultado` (jsonb). Si `veredicto` ∈ (`si`,`dudoso`) → `menores='revisar'`, `visibilidad='interna'`, `ubicaciones='{}'`, `activo=false`. Si `null` (Groq caído) → **no bloquear**: queda como declaró el estudiante y `ia_resultado = {"error": true}`.
- **Jamás degradar** una declaración `si` del estudiante por un veredicto `no` de la IA.
- Advertir en el PR: las imágenes se envían a un tercero (Groq). Es una decisión que propuso el usuario; documentarla en `CLAUDE.md` (sección de la sesión).

---

## WP7 — Backfill (Cloudinary + registro de lo existente)

Archivo: `scripts/backfill-fotos-banco.js` (Node, `--env-file=.env.local`). **Modo por defecto = simulación** (imprime qué haría, no escribe); se aplica solo con `--aplicar`. Reintentable sin duplicar.

1. **Respaldo** ya creado en WP1. Comprobar que existe.
2. **Reunir fuentes** (una consulta por fuente; conservar la URL original como clave de deduplicación):
   a. `fotos` con `url` que empiece por `/` (locales) o no sea Cloudinary.
   b. `actividades_difusion.photos` (`unnest`) — origen `noticia`/`actividad`/`difusion` (12+~11 fotos): ver §0, muchas ya están en `fotos` (las 23 de Docencia, migradas en la Sesión 36) → **saltar si `fotos.url` = URL original**.
   c. `actividades_difusion.evidencia_url` de filas `origen IN ('difusion','externo_temporal')` (fotos de eventos/podcasts de pasantes).
   d. `asistencia_espacio.foto_url` (22 filas).
3. **Subir a Cloudinary cada archivo local UNA sola vez** (mapa `rutaLocal → {secure_url, public_id}` en memoria; carpeta `pine_project_uploads/legado`; leer de `public/` con `path.join(process.cwd(), 'public', ruta)`). Si el archivo **no existe** o pesa > 10 MB → registrar en el reporte y **continuar** (jamás abortar). Pausa breve entre subidas. **No borrar** los archivos de `public/images`.
4. **Actualizar** `fotos.url` y `cloudinary_public_id` de las filas locales existentes (conservan `ubicaciones`, `order`, `activo`, `posicion`).
5. **Insertar en `fotos`** (con `registrarFotoEnBanco`/SQL equivalente e `ON CONFLICT DO NOTHING`):
   - (b)/(c) → `origen='evento'` (o `'podcast'` si `tipo='podcast'`), `ubicaciones='{}'`, `activo=true`, `menores='no'`, `proyectos = '{}'` salvo `categoria = 'vinculacion'` → `ARRAY['vinculacion']` (y en `actividades_difusion.proyectos` lo mismo), `fuente_id = actividades_difusion.id::text`, `fecha_evento = fecha`.
   - (d) asistencia → `origen='asistencia'`, `fuente_id = asistencia_espacio.id::text`, `menores='revisar'`, `visibilidad='interna'`, `activo=false`, `ubicaciones='{}'`, `proyectos=ARRAY['vinculacion']`, `subido_por_id = registrado_por`. **Decisión del usuario:** quedan en la bandeja de revisión.
6. **Las ubicaciones ya publicadas se conservan** (no reasignar). Lo que hoy no aparece en ninguna página queda "sin ubicar".
7. **Reporte final** (imprimir y pegar en el PR): filas insertadas por origen; archivos locales subidos; archivos faltantes; duplicados omitidos; `SELECT count(*)` por `origen` y por `menores`. Verificar que `count(*) FROM fotos WHERE cardinality(ubicaciones)>0` **no cambió** respecto a antes del backfill.
8. Los `actividades_difusion.photos[]` **no se tocan** (`NewsSection`/`lib/db.ts:getNewsletters()` siguen leyéndolos).

---

## WP8 — UI: `/admin/photos` reescrito con componente compartido

Componente único: **`components/fotos/BancoFotos.tsx`** (`'use client'`), props `{ modo: 'admin' | 'lider'; proyectoId?: string }`. Lo usan `/admin/photos` (WP8) y el panel del líder (WP9): **no duplicar código**. Antes de escribir, leer `app/admin/photos/page.tsx` (416 líneas) y **reutilizar** su formulario de subida, el slider de `posicion` con vista previa en vivo y la subida vía `/api/upload` → `POST /api/photos`.

Contenido:
1. **Barra de cupos** (de `GET /api/photos/ubicaciones`): una ficha por ubicación con `publicadas / max_fotos` (rojo si excede; texto "El sitio muestra solo las {max} primeras").
2. **Filtros** (mapean 1:1 a `GET /api/photos/banco`): búsqueda, origen, ubicación (incluye "Sin ubicar"), proyecto (multi-proyecto), rango de fechas, menores, estado. Estado en la URL (`useSearchParams`) para poder compartir/recargar. Paginación (24 por página).
3. **Cuadrícula** de miniaturas (`<img loading="lazy">` con `miniaturaCloudinary`, **no** `next/image` con dominios nuevos sin configurar `next.config.js`). Cada tarjeta: insignias de origen, proyecto, ubicaciones, `menores` (rojo si `si`/`revisar`), "fuente sin aprobar" (solo admin), casilla de selección.
4. **Barra de acciones en lote** (visible con ≥1 seleccionada): **Publicar en…** (checklist de ubicaciones **filtrada a las que el usuario puede usar**; las `solo_admin` no aparecen para líderes), **Quitar de…**, **Ocultar/Mostrar**, **Descartar**. Tras publicar, mostrar los `avisos` de tope. Confirmación explícita antes de `descartar`.
5. **Fotos con menores** (`menores≠'no'`): la casilla "Publicar en…" **deshabilitada** con texto "Con menores: no publicable". Solo admin ve **Marcar como revisada** (sin menores) y **Marcar como interna**.
6. **Edición de una foto** (modal): título, descripción, `posicion` (slider), `order` (número: orden dentro de la ubicación), proyectos (selector múltiple, solo admin). Explicar en la UI que el sitio muestra primero las de menor `order`.
7. **Subida directa:** admin elige uno o más proyectos (o ninguno: queda sin proyecto); líder con sus proyectos (checklist limitado a los suyos, mínimo 1). Casilla "¿Aparecen menores de edad?" obligatoria en el formulario de subida.
8. Estados: cargando, vacío ("No hay fotos con estos filtros"), error con botón reintentar. Sin `alert()` bloqueantes para éxitos.
9. `app/admin/photos/page.tsx` queda como delgado wrapper: `<BancoFotos modo="admin" />`. Mantener el gate existente (`contenido_sitio` por `/admin/*` en middleware).

Accesibilidad mínima: botones con `aria-label`, contraste, selección por teclado.

---

## WP9 — Panel del líder + galerías de proyecto (Fase B)

### 9.1 Rutas y navegación
- Páginas nuevas (no agregan funciones serverless):
  - `app/portal/proyecto/page.tsx` — lista los proyectos gestionables (de `GET /api/photos/ubicaciones`); si hay exactamente uno, redirige a su panel.
  - `app/portal/proyecto/[proyectoId]/page.tsx` — panel del proyecto (por ahora una sola sección: **Fotos**; **no** mostrar pestañas vacías "próximamente").
  - `app/portal/proyecto/[proyectoId]/fotos/page.tsx` — `<BancoFotos modo="lider" proyectoId={...} />`.
- **`middleware.ts`:** agregar `'/portal/proyecto'` a `protectedRoutes` (leer el archivo completo primero; no reordenar). La secretaria ya queda denegada por defecto (`RUTAS_SECRETARIA`). Además, cada página valida en cliente contra `GET /api/photos/ubicaciones` y muestra "No tienes permiso para este proyecto" si `proyectoId` no está en `proyectos[]` (la barrera real es la API).
- **`app/portal/dashboard/page.tsx`:** la tarjeta "Gestionar {proyecto}" (hoy arma el nombre desde el equipo, commit `c53d899`; **leer el estado actual antes de editar**) debe enlazar a `/portal/proyecto/[id]/fotos`. Un líder de varios proyectos (Verónica: `docencia_innovadora` y `mentoring`; Arturo) debe ver una tarjeta por proyecto o un enlace a `/portal/proyecto`. Administración del sitio puede seguir usando `/admin/photos`.
- **No** crear un módulo `modulos_acceso` nuevo ni tocar `/admin/roles`.

### 9.2 Galerías nuevas en páginas públicas
Crear `components/GaleriaProyecto.tsx` (cliente): props `{ ubicacion: string; titleKey: string }`; hace `fetch('/api/photos?ubicacion=…')`, **no renderiza nada si la lista está vacía**, reutiliza el diseño de `ActivityGallery`/`EnglishClubSection` (leerlos antes). Textos con `t('…')`: agregar en `lib/i18n.tsx` (ES **y** EN) una clave de título por galería (`t.gallery.internacionalizacion`, `t.gallery.desarrolloHabilidades`, `t.gallery.mentoring`, …). Insertarla en:
- `app/investigacion/proyecto-innovacion/page.tsx` → `internacionalizacion-galeria`
- `app/investigacion/desarrollo-habilidades/page.tsx` → `desarrollo-habilidades-galeria`
- `app/investigacion/mentoring/page.tsx` → `mentoring-galeria`
- `app/proyectos/[slug]/page.tsx` (plantilla simple) → `${proyecto.id}-galeria` **solo si esa ubicación existe** (ver 9.3).
Docencia (`ActivityGallery`), RED LEA y Club **no se tocan**: ya leen su ubicación.

### 9.3 Proyectos nuevos creados desde `/admin/proyectos`
En `POST /api/proyectos` (crear proyecto `plantilla_simple`), insertar en la misma transacción una fila `fotos_ubicaciones` (`slug = <id>-galeria`, `proyecto_id = <id>`, `max_fotos = 8`, `solo_admin = false`). Leer `app/api/proyectos/route.ts` completo antes; cambio mínimo.

---

## WP10 — Notificaciones

Leer `lib/notificaciones.ts` y `NOTIFICACIONES.md` completos y seguir su checklist. Reglas **derivadas** (conteos en vivo, sin tabla nueva), agregadas al final de `REGLAS_NOTIFICACION`:
1. `fotos-menores-por-revisar` — audiencia: `puedeAdministrarSitio`. Cuenta `fotos WHERE menores='revisar'`. `href: '/admin/photos?menores=revisar'`. Severidad `pendiente`.
2. `fotos-sin-ubicar-proyecto` — audiencia: líder/colíder por proyecto. Cuenta fotos con `proyectos && <ids del proyecto>`, `publicable`, `menores='no'`, `cardinality(ubicaciones)=0`, fuente aprobada, creadas en los últimos 14 días. `href: '/portal/proyecto/<id>/fotos?estado=sin_ubicar'`. Severidad `info`.
Cada `aplica()` debe ser **la misma condición** que protege la pantalla destino. Agregar las filas correspondientes a `NOTIFICACIONES.md`.

---

## WP11 — Pruebas, documentación, despliegue

### 11.1 Pruebas de permisos (obligatorias, contra `npm run dev` con la Neon real)
Usar `scripts/_lib-sign-session.mjs` (firma cookies sin contraseña; ver `scratch/test-roles.mjs` como referencia local, está en `.gitignore`). Escribir `scripts/test-fotos-permisos.mjs`. **Crear filas de prueba con id `foto_test_*`, `proyecto_id` real, y borrarlas al final (`DELETE ... WHERE id LIKE 'foto_test_%'`); nunca tocar filas reales.** Matriz mínima (códigos esperados):

| Actor | Acción | Esperado |
|---|---|---|
| Anónimo | `GET /api/photos/banco`, `POST /api/photos/accion` | 401 |
| Secretaria | ambas | 403 |
| Estudiante/pasante | ambas | 403 |
| Líder Verónica (id 20) | publicar foto de `docencia_innovadora` en `docencia-galeria` | 200 |
| Líder Verónica | publicar en `redlea-galeria` (proyecto ajeno) | 403 |
| Líder Verónica | publicar en `portada` | 403 |
| Colíder Cristina (id 14) | publicar foto de `desarrollo_habilidades` en `desarrollo-habilidades-galeria` | 200 |
| Participante de un proyecto (no líder) | publicar | 403 |
| Líder | publicar foto con `menores='revisar'` | 409 |
| Líder | `GET /api/photos/banco` | nunca devuelve filas `interna`, `menores≠no`, `proyectos` vacío ni de otro proyecto |
| Admin de sitio | publicar en `portada`; `marcar_revisada` | 200 |
| Admin de sitio | lote de 3 ids con 1 inválido | 4xx y **ninguna** foto modificada (atomicidad) |
| Docente Cristina (miembro de `desarrollo_habilidades` e `internacionalizacion`) | `POST /api/difusion` con `proyectos: ['redlea']` | 403 |
| Docente Cristina | `POST /api/difusion` con `proyectos: ['desarrollo_habilidades']` | 200 |
| Docente sin proyectos | `POST /api/difusion` | 400/403 y `GET /api/proyectos?asignables=1` = `[]` |
| Admin de sitio | `POST /api/difusion` con `proyectos: ['redlea','mentoring']` | 200 |
| Docente | generar QR con proyecto ajeno | 403; con proyecto propio → 200 |
| Externo (sin sesión) | `POST /api/enlaces-difusion/[token]` enviando `proyectos: ['redlea']` distinto al del enlace | 200 pero se guarda el proyecto **del enlace**, no el del cuerpo |
| Pasante | `POST /api/difusion` con `proyectos: ['mentoring']` | 403; con `['vinculacion']` → 200 |
| Público (sin sesión) | `GET /api/photos?ubicacion=docencia-galeria` con 12 fotos publicadas | ≤ 8 filas (6 manuales + 2 podcast) |
| Público | `GET /api/photos?ubicacion=inexistente` | `[]` |
| SQL directo | `UPDATE fotos SET ubicaciones='{portada}' WHERE menores='revisar'` | error `23514` (CHECK) |

Probar también **con "Ver como"** (suplantar a Verónica desde Arturo): debe comportarse como Verónica, no como Arturo.

### 11.2 Verificación por fase
`npx tsc --noEmit` limpio; `npm run build` completo (sin `DATABASE_URL` de relleno, ver regla 4); `grep` de conflictos y archivos vacíos (regla 3); SELECT post-migración (WP1) y reporte de backfill (WP7) pegados en el PR; revisión visual real en el navegador (Docencia con ≤8 fotos, portada con ≤6, panel del líder con su proyecto); `list_deployments` → `READY`.

### 11.3 Documentación (misma entrega)
- `CLAUDE.md` y `ANTIGRAVITY.md`: nueva sección de sesión con: tablas/columnas nuevas, `fotos_ubicaciones`, reglas de menores (incl. envío a Groq), `lib/permisosProyecto.ts`, ruta `/portal/proyecto/...`, topes, y la instrucción de que **toda función nueva por proyecto usa `puedeGestionarProyecto`**. Actualizar la fila `fotos` de la tabla "Tablas Neon" y agregar `fotos_ubicaciones`.
- `NOTIFICACIONES.md` (WP10). `MANUAL_USUARIO.md`: sección "Administrar las fotos de tu proyecto (líderes)" y "Declarar menores al subir fotos (pasantes)".
- `.env.local.example`: `GROQ_VISION_MODEL`.

---

## 12. Hoja de ruta (NO implementar ahora — pero no bloquearla)

La meta es que cada líder administre **todos** los datos de su proyecto. Esta entrega deja la infraestructura; las siguientes entregas reutilizan `puedeGestionarProyecto` y el espacio `/portal/proyecto/[proyectoId]/…`:

| Entrega futura | Base ya lista / trabajo pendiente |
|---|---|
| Texto del proyecto (hero, integración, info, contacto) | Columnas `proyectos.hero_*`, `integration_text_*`, `info_text_*` existen; hoy `PATCH /api/proyectos/[slug]` es solo `contenido_sitio`. Abrirlo al líder **solo de su proyecto** y solo a esos campos. Proyectos `personalizada` tienen secciones con código propio: el líder solo edita lo que la BD controla. |
| Equipo del proyecto | `proyecto_miembros` + `/admin/members`. Un líder gestiona miembros **de su proyecto** (no roles de otros proyectos ni `modulos_acceso`). Cuidado: `lib/permisosPertenencia.ts` deriva módulos del rol en el proyecto → un líder no debe poder ascender a otro a líder de Vinculación. |
| Noticias, actividades y podcasts de su proyecto | Tras WP5b ya existe `actividades_difusion.proyectos[]` (obligatorio al registrar) y `videos.proyecto_id[]`: el líder aprueba/oculta lo de su proyecto; `contenido_sitio` sigue siendo la moderación global. |
| Publicaciones por proyecto | `publications` no tiene columna de proyecto: requiere migración. |
| Tope y galerías editables por líder | Hoy solo admin edita `fotos_ubicaciones`. |

Regla para esas entregas: **el permiso siempre se calcula en el servidor, por proyecto, consultando `proyecto_miembros`**; nunca por email hardcodeado ni solo por la cookie.

---

## 13. Riesgos conocidos y mitigaciones

| Riesgo | Mitigación en este plan |
|---|---|
| Foto con menores publicada por error | Tres barreras: (1) declaración del estudiante, (2) Groq como respaldo, (3) `CHECK fotos_publicable_sin_menores` en BD + filtro en `GET` público + validación en la API. |
| Groq falla o es lento | `analizarMenoresEnFoto` devuelve `null`, nunca bloquea el registro; queda con la declaración del estudiante. |
| Líder ve/publica fotos ajenas | Alcance por `proyectos` (solape de arreglos) en cada consulta y en cada acción; pruebas 11.1; permisos consultados en Neon, no en la cookie. |
| Docencia baja de 23 a 8 fotos al desplegar | Avisado (WP1); el admin cura el `order` inmediatamente. Tope suave: nada se borra. |
| Backfill duplica o pierde fotos | Simulación por defecto, `ON CONFLICT DO NOTHING`, respaldo `respaldo_fotos_20260926`, reporte con conteos. |
| Exceso de funciones Vercel | Solo 3 rutas nuevas (`banco`, `accion`, `ubicaciones`); el resto son páginas y extensiones. |
| Antigravity introduce conflictos / archivos vacíos / claves duplicadas | Reglas 1–3 y 10; rama propia; `grep` y `find` antes de cada commit. |
| RED LEA sin líder | D2: asignar líder en `/admin/members`; mientras tanto la gestiona la administración del sitio. |
| `GET /api/photos?all=true` deja de ser público | WP3 exige migrar todos los llamadores en el mismo cambio (`grep`). |

---

## 14. Checklist de cierre (marcar antes de pedir el merge)

- [ ] Rama `feat/admin-lideres-fotos`; nada commiteado en `main`.
- [ ] WP1 aplicado en Neon con SELECT de verificación; respaldo existente.
- [ ] `tsc` y `build` limpios; sin conflictos ni archivos de 0 bytes.
- [ ] Los 4 componentes públicos ocultan su sección con lista vacía.
- [ ] Matriz 11.1 completa en verde (incluye "Ver como").
- [ ] Backfill: reporte pegado; conteo de fotos ubicadas sin cambios.
- [ ] Fotos de asistencia previas en `menores='revisar'`/`interna` (22).
- [ ] WP5b: validación de proyectos asignables en `difusion`, `videos`, `enlaces-difusion` (+ público) y selector en los 4 formularios.
- [ ] D2 hecho por Arturo (Jhonny líder de RED LEA) antes de la Fase B; D5 confirmada.
- [ ] Notificaciones (WP10) + `NOTIFICACIONES.md`.
- [ ] Documentación (§11.3).
- [ ] Deploy en `READY` y revisión visual en producción.
