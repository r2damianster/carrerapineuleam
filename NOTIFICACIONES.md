# Notificaciones del Portal PINE

> Documento de referencia para Claude y Antigravity. **Léelo antes de agregar cualquier función nueva al portal** (`/portal`, `/vinculacion`, `/investigacion`, `/admin`, `/gestion-carrera`, etc.).

## Qué es
Bloque **"🔔 Pendientes"** al inicio de `/portal/dashboard` + endpoint `GET /api/notificaciones`. Avisa a cada docente de lo que tiene por hacer al entrar al portal (ej. supervisor: "tienes 3 asistencias por aprobar"; admin de contenido: "tienes 2 videos por aprobar").

## Cómo funciona
- **Notificaciones derivadas, sin tabla.** Cada aviso es un conteo en vivo sobre datos que ya existen en Neon. No se guarda nada, así nunca quedan desincronizadas ni requieren migración. Cuando el pendiente se resuelve, el aviso desaparece solo.
- **Un registro de reglas** en [lib/notificaciones.ts](lib/notificaciones.ts) → `REGLAS_NOTIFICACION`. Cada regla tiene `id`, `aplica(sesion)` (quién lo ve) y `consultar(sql, sesion)` (devuelve la notificación o `null`).
- `obtenerNotificaciones(sesion)` corre las reglas aplicables en paralelo; una regla que falla se registra en consola y no tumba las demás.
- **"Ver como":** usa la sesión activa, o sea la del usuario suplantado. Se ve lo que esa persona vería.
- UI: [components/PendientesPortal.tsx](components/PendientesPortal.tsx) (Server Component, oculto si no hay avisos).
- API: `GET /api/notificaciones` (sesión requerida, `no-store`), listo para una campana/refresco cliente a futuro.

## Reglas activas
| `id` | Quién lo ve | Qué cuenta | Destino |
|---|---|---|---|
| `asistencias-por-aprobar` | supervisor de Vinculación (`vinculacion` o `vinculacion_gestion`). Supervisor regular: solo espacios con `profesor_id` = él; superadmin/líderes (`esSuperAdminOLider`): todos | `asistencia_espacio.estado_aprobacion='pendiente'` (área vinculación) | `/vinculacion/supervisar` |
| `horas-por-aprobar` | Supervisor de Vinculación (`vinculacion` o `vinculacion_gestion`). Supervisor regular: pasantes de sus espacios (`profesor_id` = él); líder/superadmin: todos | `horas_podcast_pasante` + `actividades_investigacion_pasante` + `actividades_autonomas_pasante` con `estado_aprobacion='pendiente'` | `/vinculacion/supervisar` |
| `videos-por-aprobar` | `modulos_acceso: contenido_sitio` | `videos.aprobado_sitio=false` | `/admin/videos` |
| `difusion-por-aprobar` | `modulos_acceso: contenido_sitio` | `actividades_difusion.aprobado_sitio=false` (incluye `origen='externo_temporal'`) | `/admin/contenido` |
| `asistencias-rechazadas` | `rol: estudiante` (pasante) | Sus `asistencia_espacio` con `estado_aprobacion='rechazado'` en los últimos 14 días (sin tabla de "leído": la ventana de tiempo apaga el aviso) | `/portal/mi-avance` (panel rojo con espacio, fecha y motivo, vía `GET /api/mi-avance`) |

## ✅ Checklist obligatoria al crear una función nueva
Si la función que agregas hace que **alguien tenga que actuar** (aprobar, revisar, completar, responder, corregir un rechazo), entonces:

1. **Agrega una regla** a `REGLAS_NOTIFICACION` en `lib/notificaciones.ts`.
2. `aplica()` debe usar **exactamente la misma condición de acceso** que protege la pantalla destino (rol, `modulos_acceso`, `puedeOperarEspacio`, `esSuperAdminOLider`…). Nunca mostrar un aviso a quien no puede abrir el enlace.
3. `consultar()` cuenta pendientes reales (`COUNT(*)::int`), devuelve `null` si es 0, y usa el mismo filtro de alcance que la pantalla destino (ej. por `profesor_id`).
4. El mensaje va en español, con plural correcto (helper `plural`), y `href` apunta a la pantalla donde se resuelve.
5. **Actualiza la tabla "Reglas activas" de este archivo.**
6. Si la función ya existía y no aparece aquí, evalúa si genera pendientes; si sí, agrégala.
7. Verifica: `npx tsc --noEmit`, `npm run build`, y prueba con "Ver como" el rol afectado.

**No requieren notificación:** pantallas de solo consulta, formularios que el usuario llena por iniciativa propia sin que nadie deba responder, contenido público.

## Reglas
- `neon()` siempre **dentro** de la función (ya lo hace `obtenerNotificaciones`), con `cache: 'no-store'`.
- Si una regla necesita guardar estado propio (ej. "marcar como leído"), es una tabla nueva: migración **a mano**, nunca `prisma db push`, y ampliar cualquier CHECK en el mismo cambio.

## Decisiones (Sesión 50)
- **Hecho:** aviso de asistencia rechazada al pasante. Es accionable (debe re-registrar) y se resuelve con ventana de 14 días, sin tabla nueva.
- **Descartado a propósito:** campana en la barra superior (el dashboard es la puerta de entrada al portal; el endpoint `GET /api/notificaciones` queda listo si se cambia de idea); aviso de "horas acreditadas" (informativo, no exige acción, requeriría tabla de "leído"); videos sin link de YouTube y enlaces por expirar (bajo valor); correo/push por cron (costo y ruido sin uso real que lo justifique).
- **Reabrir si:** aparece un aviso informativo que sí valga la pena → ahí sí crear `notificaciones_leidas` (migración a mano).
