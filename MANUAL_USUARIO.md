# 📖 Manual de Usuario - Portal PINE

Bienvenido al manual de uso del **Portal PINE** (Innovaciones Pedagógicas e Internacionalización), ULEAM. Sistema para gestionar el trabajo de campo de Vinculación (Club de Inglés y otros espacios), Investigación, y el registro de indicadores (MCER, asistencia, encuestas, difusión).

**🌐 Acceso a la plataforma:** [https://carrerapineuleam.vercel.app/portal/login](https://carrerapineuleam.vercel.app/portal/login)

> Esta es distinta de la página pública del proyecto (`/investigacion/proyecto-innovacion`, etc.) — el Portal es solo para quienes tienen cuenta.

---

## Primer ingreso: crear tu cuenta

1. Ve a **Registro**: [https://carrerapineuleam.vercel.app/registro](https://carrerapineuleam.vercel.app/registro)
2. Llena tus datos y elige tu rol:
   - **Profesor** — solo si tu email está en la lista autorizada del proyecto (contacta al líder si te sale "correo no autorizado").
   - **Estudiante Universitario** — cualquiera puede autoregistrarse. Indica tu carrera y modalidad (Club de Inglés, Podcast, Investigación, Otro).
   - **Beneficiario / Participante** — para quien recibe el programa (ej. asistente al Club de Inglés).
3. La contraseña la eliges tú — nadie más la sabe, ni el equipo de soporte.
4. Al registrarte, entras automáticamente. Para volver a entrar después: [https://carrerapineuleam.vercel.app/portal/login](https://carrerapineuleam.vercel.app/portal/login)

Tras entrar llegas a `/portal/dashboard`, donde ves solo las tarjetas que te corresponden según tu rol.

---

## 👨‍🏫 Perfil: Profesor de Vinculación (hoy: Arturo, Cynthia)

Tarjeta **"Gestionar Vinculación"** en el Portal.

### A. Crear un Espacio
`» Espacios` → formulario "Nuevo Espacio de Vinculación". Un espacio es un club, aula o encuentro comunitario (ej. "Club de Inglés A"), asociado a un ciclo/semestre.

### B. Asignar Instructores
Entra al espacio que creaste (clic en su nombre) → tab **Instructores**. Elige de la lista de estudiantes registrados quiénes van a operar ese espacio. Solo el profesor hace esto.

### C. Respaldo operativo
El profesor también puede hacer todo lo que hace un estudiante-instructor (ver abajo) en **cualquier** espacio de vinculación, no solo en los que él mismo creó — es respaldo, no reemplazo del instructor.

### D. Registrar Nuevos Perfiles
Enlace directo a `/registro`, para invitar gente nueva.

---

## 👩‍🎓 Perfil: Estudiante Instructor de Vinculación

Después de que un profesor te asigna a un espacio, entras a `/portal/dashboard` → **"Gestionar Vinculación"** → `» Espacios` → clic en tu espacio asignado (solo ves los tuyos). Ahí tienes 4 pestañas:

### Beneficiarios
Selecciona de la lista general quiénes participan en tu espacio y haz clic en "Inscribir Seleccionados".

### Test MCER
1. Botón **"📄 Descargar Test en Word"** — imprímelo y dáselo al beneficiario en papel.
2. Selecciona el beneficiario (solo aparecen los inscritos en tu espacio), indica si es *Pre* o *Post*, transcribe sus respuestas.
3. Sube una foto del test físico resuelto (opcional).
4. El sistema calcula el nivel (A1/A2/B1/B2) automáticamente.

### Encuesta
Selecciona beneficiario + ciclo, calificación de 1 a 5 estrellas, comentarios opcionales.

### Asistencia
Fecha + selecciona quiénes de tu espacio estuvieron presentes + observaciones opcionales.

> Todo lo de arriba solo funciona **dentro de tu espacio asignado** — si intentas entrar a un espacio donde no eres instructor, el sistema te lo bloquea.

### Difusión / Evento
Aparte del espacio, cualquier estudiante puede registrar un podcast/evento en `/vinculacion/difusion`: título, tipo, fecha, audiencia alcanzada, evidencia (captura o foto).

---

## 🔬 Perfil: Investigación (hoy: Jhonny, German, Cristina, Johana)

Tarjeta **"Gestionar Investigación"** → `» Espacios`. Por ahora solo permite crear y listar espacios de investigación (cohortes, por ejemplo) — sin ninguna otra función todavía. El equipo tiene planeado agregar gestión de artículos científicos más adelante.

---

## 🎤 Perfil: Cualquier Docente — Gestión de Carrera

Tarjeta **"Gestión de Carrera"**, visible a cualquier profesor sin importar su área. `/gestion-carrera` — registro de eventos generales de la carrera, distinto del formulario simple de Difusión que usa el estudiante-instructor:

- **Categoría**: Investigación (indica el proyecto) / Vinculación / Asignatura (indica el nombre de la materia).
- Tipo de evento, número de asistentes, descripción, fecha, hora, observaciones (opcional), foto (opcional).

---

## 📊 Perfil: Gerencia — Dashboard de Indicadores

Solo para quien tiene el módulo `admin`. Tarjeta **"Indicadores (Gerencia)"** → `/pine-dashboard`: mejora de nivel MCER, satisfacción promedio de encuestas, audiencia de difusión, investigadores vinculados — en tiempo real desde la base de datos.

---

## 🛠️ Panel de administración del sitio (contenido público)

Distinto de todo lo anterior — es para editar el contenido de la página pública (miembros del equipo, publicaciones, videos, noticias). `/admin`, requiere el mismo login del Portal (`/portal/login`) con el módulo `admin`.

---

## Nota para quien ya tenía cuenta antes de agosto 2026

El sistema de asistencia viejo (con cuentas de Andy Castillo, Josselyn Mera y Ailys Bailón) fue reemplazado — esas cuentas quedaron huérfanas y sus contraseñas no se pueden recuperar. Si eras parte de ese grupo, **regístrate de nuevo** en `/registro`.
