# 📖 Manual de Usuario - Portal PINE

Bienvenido al manual de uso del **Portal PINE** (Innovaciones Pedagógicas e Internacionalización), ULEAM. Sistema para gestionar el trabajo de campo de Vinculación (Club de Inglés y otros espacios), Investigación, y el registro de indicadores (MCER, asistencia, encuestas, difusión).

**🌐 Acceso a la plataforma:** [https://carrerapineuleam.vercel.app/portal/login](https://carrerapineuleam.vercel.app/portal/login)

> Esta es distinta de la página pública del proyecto (`/investigacion/proyecto-innovacion`, etc.) — el Portal es solo para quienes tienen cuenta.

---

## Primer ingreso: quién crea tu cuenta y cómo

No todos los roles se autoregistran — depende de quién eres:

| Rol | ¿Cómo entra por primera vez? |
|---|---|
| **Profesor** | Se autoregistra en [/registro](https://carrerapineuleam.vercel.app/registro), pero **solo si su correo está en la lista autorizada del proyecto** (contacta al líder si sale "correo no autorizado"). |
| **Estudiante / Pasante-instructor de vinculación** | **No hay pantalla de registro.** Tu profesor te da de alta desde Administrar Pasantes (solo nombres/apellidos/email). La primera vez que entras en [/portal/login](https://carrerapineuleam.vercel.app/portal/login) con ese correo, la clave que escribas queda guardada como tu contraseña definitiva — de ahí en adelante entras normal. |
| **Beneficiario / Participante** | **Nunca tiene cuenta ni contraseña.** Lo registra su instructor o profesor desde `/vinculacion/beneficiarios` como parte de sus datos, no como usuario del sistema. |

Tras entrar llegas a `/portal/dashboard`, donde ves solo las tarjetas que te corresponden según tu rol y tus módulos asignados.

---

## 👨‍🏫 Perfil: Profesor de Vinculación (hoy: Arturo, Cynthia)

Dos tarjetas separadas en el Portal:

### Registros de Vinculación (tareas del día a día)
El profesor puede hacer todo lo que hace un estudiante-instructor (ver más abajo) en **cualquier** espacio de vinculación, no solo en los que él mismo creó — es respaldo, no reemplazo del instructor.

### Gestión de Vinculación (solo profesor/admin)

**» Administrar Espacios** (`/vinculacion/espacios`) — crea/lista espacios (clubes, aulas, cohortes). Un espacio es, por ejemplo, "Club de Inglés A", asociado a un ciclo/semestre. Al entrar a un espacio (clic en su nombre) puedes asignar qué pasantes son instructores de ese espacio — la única función que queda ahí; asistencia/beneficiarios/MCER/encuesta se manejan aparte, ver abajo.

**» Administrar Pasantes** (`/vinculacion/pasantes`) — CRUD completo de estudiantes-instructores:
- **Uno por uno:** formulario con nombres, apellidos y email — nada de contraseña, la define el pasante en su primer ingreso (ver tabla de arriba).
- **Carga masiva por Excel:** botón "Descargar plantilla" (`.xlsx` con columnas Nombres/Apellidos/Email) → llenar y subir el archivo → aparece una vista previa marcando cada fila como ✅ válida o ❌ con el motivo (campo faltante, email inválido, repetido en el archivo, o ya registrado) → "Confirmar y Crear" solo inserta las filas válidas. Nada se guarda hasta confirmar.
- Editar/eliminar pasantes existentes, ver en qué espacios es instructor cada uno, y su estado (Activo / Pendiente de activar).

---

## 👩‍🎓 Perfil: Estudiante / Pasante-Instructor de Vinculación

Después de que tu profesor te da de alta y activas tu cuenta (primer login), entras a `/portal/dashboard` → **"Registros de Vinculación"**. Son páginas independientes, cada una con su propio selector de espacio (si eres instructor de varios, eliges cuál):

### » Registrar Asistencia (`/vinculacion/asistencia`)
Elige el espacio y la fecha — la lista de beneficiarios inscritos aparece **con el check ya marcado como presente**; desmarca solo a los ausentes. Observaciones opcionales.

### » Registrar Beneficiarios (`/vinculacion/beneficiarios`)
- **Asignar existente:** selecciona de la lista general de beneficiarios quiénes participan en tu espacio.
- **Registrar nuevo:** nombres, apellidos, contacto, email (opcional), edad, si tiene discapacidad (y cuál), y situación ocupacional — el formulario pregunta distinto según la respuesta:
  - Solo estudia / Estudia y trabaja / Solo trabaja / Desempleado y no estudia
  - Si trabaja: qué rol ejerce
  - Si estudia: nivel educativo (universidad / colegio / escuela) — si es universidad, además carrera y curso/semestre
- El beneficiario queda registrado y asignado a tu espacio en el mismo paso. No inicia sesión — es solo su ficha de datos.

### » Test MCER (`/vinculacion/test-mcer`)
1. Botón **"📄 Descargar Test en Word"** — imprímelo y dáselo al beneficiario en papel.
2. Selecciona el beneficiario (solo aparecen los inscritos en tu espacio), indica si es *Pre-Test* o *Post-Test*, transcribe sus respuestas.
3. Sube una foto del test físico resuelto (opcional).
4. El sistema calcula el nivel (A1/A2/B1/B2) automáticamente.

### » Encuesta (`/vinculacion/encuesta`)
Selecciona beneficiario + ciclo, calificación de 1 a 5 estrellas, comentarios opcionales.

### » Difusión / Evento (`/vinculacion/difusion`)
Sin selector de espacio — cualquier estudiante registra un podcast/evento: título, tipo, fecha, audiencia alcanzada, evidencia (captura o foto, obligatoria).

> Todo lo de arriba (excepto Difusión) solo funciona **dentro de tu espacio asignado** — si intentas operar un espacio donde no eres instructor, el sistema te lo bloquea.

---

## 🔬 Perfil: Investigación (hoy: Jhonny, German, Cristina, Johana)

Tarjeta **"Gestionar Investigación"**. Por ahora no tiene ninguna función propia — el equipo tiene planeado agregar gestión de artículos científicos más adelante.

---

## 🎤 Perfil: Cualquier Docente — Gestión de Carrera

Tarjeta **"Gestión de Carrera"**, visible a cualquier profesor sin importar su área. `/gestion-carrera` — registro de eventos generales de la carrera, distinto del formulario simple de Difusión que usa el estudiante-instructor:

- **Categoría**: Investigación (indica el proyecto) / Vinculación / Asignatura (indica el nombre de la materia).
- Tipo de evento, número de asistentes, descripción, fecha, hora, observaciones (opcional), foto (opcional).

---

## 📊 Perfil: Indicadores (módulo `admin`)

Solo para quien tiene el módulo `admin` (hoy: Arturo, Jhonny, German, Verónica). Tarjeta **"Indicadores"** → `/pine-dashboard`, agrupado por área (hoy solo Vinculación): mejora de nivel MCER, satisfacción promedio de encuestas, audiencia de difusión, investigadores vinculados — en tiempo real desde la base de datos.

---

## 🛠️ Gestión del Sitio (contenido público)

Distinto de todo lo anterior — es para editar el contenido de la página pública (miembros del equipo, publicaciones, videos, noticias, documentos). Tarjeta **"Gestión del Sitio"** → `/admin`, requiere el mismo login del Portal con el módulo `contenido_sitio` — **restringido solo a Arturo Rodríguez y Jhonny Villafuerte** (líder/colíder de este proyecto), no es lo mismo que el módulo `admin` de Indicadores.

---

## Nota para quien ya tenía cuenta antes de agosto 2026

El sistema de asistencia viejo (con cuentas de Andy Castillo, Josselyn Mera y Ailys Bailón) fue reemplazado — esas cuentas quedaron huérfanas y sus contraseñas no se pueden recuperar. Si eras parte de ese grupo, **regístrate de nuevo** como el rol que te corresponda (ver tabla al inicio del manual).
