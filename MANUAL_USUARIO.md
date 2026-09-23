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
| **Beneficiario / Participante** | **Nunca tiene cuenta ni contraseña.** Lo registra su instructor o profesor desde `/vinculacion/registrar-evaluar` como parte de sus datos, no como usuario del sistema — siempre junto con su Pre-Test. |

Tras entrar llegas a `/portal/dashboard`, donde ves solo las tarjetas que te corresponden según tu rol y tus módulos asignados.

---

## 👨‍🏫 Perfil: Profesor de Vinculación (hoy: Arturo, Cynthia)

Dos tarjetas separadas en el Portal:

### Registros de Vinculación (tareas del día a día)
El profesor puede hacer todo lo que hace un estudiante-instructor (ver más abajo) en **cualquier** espacio de vinculación, no solo en los que él mismo creó — es respaldo, no reemplazo del instructor.

### Gestión de Vinculación (solo profesor/admin)

**» Supervisar Asistencia & Indicadores** (`/vinculacion/supervisar` e `/vinculacion/supervisar/indicadores`) — aprueba/rechaza registros de asistencia recibidos con foto evidencia. Incluye el botón **"📊 Ver Indicadores & Analítica"** para acceder al nuevo panel de supervisión por pasante, matriz de ganancia MCER (Pre vs Post), alertas de asistencias pendientes >72h e informes ejecutivos.

**» Administrar Espacios** (`/vinculacion/espacios`) — crea/lista espacios (clubes, aulas, cohortes). Un espacio es, por ejemplo, "Club de Inglés A", asociado a un ciclo/semestre. Al entrar a un espacio (clic en su nombre) puedes asignar qué pasantes son instructores de ese espacio — la única función que queda ahí; asistencia/beneficiarios/MCER/encuesta se manejan aparte, ver abajo.

**» Administrar Pasantes** (`/vinculacion/pasantes`) — CRUD completo de estudiantes-instructores:
- **Uno por uno:** formulario con nombres, apellidos y email — nada de contraseña, la define el pasante en su primer ingreso (ver tabla de arriba).
- **Carga masiva por Excel:** botón "Descargar plantilla" (`.xlsx` con columnas Nombres/Apellidos/Email) → llenar y subir el archivo → aparece una vista previa marcando cada fila como ✅ válida o ❌ con el motivo (campo faltante, email inválido, repetido en el archivo, o ya registrado) → "Confirmar y Crear" solo inserta las filas válidas. Nada se guarda hasta confirmar.
- Editar/eliminar pasantes existentes, ver en qué espacios es instructor cada uno, y su estado (Activo / Pendiente de activar).

---

## 👩‍🎓 Perfil: Estudiante / Pasante-Instructor de Vinculación

Después de que tu profesor te da de alta y activas tu cuenta (primer login), entras a `/portal/dashboard` → **"Registros de Vinculación"**. Son páginas independientes, cada una con su propio selector de espacio (si eres instructor de varios, eliges cuál):

### » Registrar y evaluar beneficiario (`/vinculacion/registrar-evaluar`)
Un beneficiario nuevo **siempre** se registra junto con su Pre-Test MCER — no queda registrado sin evaluación, es un solo envío obligatorio en la misma pantalla:
- **Registrar nuevo + Pre-Test:** nombres, apellidos, contacto, email (opcional), edad, si tiene discapacidad (y cuál), y situación ocupacional (Solo estudia / Estudia y trabaja / Solo trabaja / Desempleado y no estudia — si trabaja, qué rol; si estudia, nivel educativo y, si es universidad, carrera y curso), seguido de las preguntas del Pre-Test MCER. El beneficiario no inicia sesión — es solo su ficha de datos.
- **Asignar beneficiario existente:** para alguien que ya es beneficiario en otro espacio/ciclo — ya tiene su Pre-Test de antes, solo se le suma a este espacio, sin repetir la evaluación.
- **QR Auto-registro + Pre-Test:** botón que genera un link/QR para el espacio — cada beneficiario se registra él mismo desde su celular y responde el Pre-Test en la misma pantalla, sin login.
- **📄 Descargar Pre-Test en Word:** para aplicarlo en papel — trae también los campos de datos del beneficiario en blanco, ya que el registro y el Pre-Test van siempre juntos.

### » Asistencia (`/vinculacion/asistencia`)
Elige el espacio y la fecha — la lista de beneficiarios inscritos aparece **con el check ya marcado como presente**; desmarca solo a los ausentes. Observaciones opcionales.

### » Evaluación final del beneficiario (`/vinculacion/evaluacion-final`)
El Post-Test MCER y la Encuesta de Satisfacción se responden juntos, en un solo envío (el beneficiario ya está registrado de antes, aquí no se piden sus datos):
1. Botón **"📄 Descargar Evaluación Final en Word"** — para aplicarla en papel (MCER + encuesta en blanco).
2. Selecciona el beneficiario (solo aparecen los inscritos en tu espacio) y el ciclo académico a evaluar, transcribe sus respuestas del MCER.
3. Sube una foto de la evaluación física resuelta (opcional). El sistema calcula el nivel (A1/A2/B1/B2) automáticamente.
4. Sigue la Encuesta de Satisfacción (satisfacción general, aprendizaje, mejora, recursos, calificación por instructor, comentarios) — obligatoria en el mismo envío.
5. **QR Evaluación Final:** genera un link/QR para que el beneficiario tome el Post-Test + encuesta él mismo desde su celular, sin login.
6. ¿Necesitas reenviar solo la encuesta suelta (sin MCER, ej. si el Post-Test ya se tomó antes)? Hay un link a `/vinculacion/encuesta` al pie de la página, para ese caso puntual.

### » Registrar podcast o evento (`/vinculacion/difusion`)
Sin selector de espacio — cualquier estudiante registra un podcast/evento: título, tipo, fecha, audiencia alcanzada, evidencia (captura o foto, obligatoria).

> Todo lo de arriba (excepto Registrar podcast o evento) solo funciona **dentro de tu espacio asignado** — si intentas operar un espacio donde no eres instructor, el sistema te lo bloquea.

---

## 🔬 Perfil: Investigación (hoy: Jhonny, German, Cristina, Johana)

Tarjeta **"Gestionar Investigación"** — dos funciones:

- **» Administrar Espacios** (`/investigacion/espacios`) — crear/listar espacios de investigación.
- **» Informes Mensuales** (`/investigacion/informes`) — elige un rango de fechas, el sistema trae las actividades/publicaciones/episodios de podcast de ese período, genera un resumen ejecutivo asistido por IA y arma el documento descargable. Queda guardado un historial de los informes generados anteriormente.

---

## 📝 Perfil: Cualquier Docente — Contribuciones Académicas y Utilidades

Dos tarjetas visibles a cualquier profesor con cuenta, sin importar su área:

- **» Contribuciones Académicas** (`/contribuciones/new`) — registra tu producción académica (artículos, libros, capítulos, memorias de evento, propiedad intelectual) con los campos específicos según el tipo elegido. El listado completo (`/contribuciones`) solo lo ve quien tiene el módulo `admin`.
- **» Utilidades** (`/utilidades`) — generador de documentos de trámite de la carrera: Acta Técnica, Oficios, Convocatorias (a docentes o estudiantes vía Excel), PATs de Maestría, Pares Lectores (evaluación de trabajos de titulación) y Certificados. Todos con redacción asistida por IA para los campos de texto libre, y selector de docentes/autoridades ya cargado (no hace falta escribir nombres a mano).

---

## 🎤 Perfil: Cualquier Docente — Gestión de Carrera

Tarjeta **"Gestión de Carrera"**, visible a cualquier profesor sin importar su área. `/gestion-carrera` — registro de eventos generales de la carrera, distinto del formulario simple de Difusión que usa el estudiante-instructor:

- **Categoría**: Investigación (indica el proyecto) / Vinculación / Asignatura (indica el nombre de la materia).
- Tipo de evento, número de asistentes, descripción, fecha, hora, observaciones (opcional), foto (opcional).

---

## 📊 Perfil: Indicadores (módulo `admin`)

Solo para quien tiene el módulo `admin` (hoy: Arturo, Jhonny, German, Verónica). Tarjeta **"Indicadores"** → `/pine-dashboard`, agrupado por áreas (Vinculación e Investigación):
- **Diagnóstico MCER (Pre-Test) — Semestre Actual:** Beneficiarios evaluados en test inicial respecto al total de inscritos en talleres (cobertura diagnóstica en tiempo real).
- **Evaluaciones Finales (Post-Test) — Meta Proyecto (2 Años):** Avance de los participantes que culminan su evaluación final al cierre de ciclo respecto a la meta de 100 evaluados.
- **Beneficiarios Inscritos & Atendidos:** Cantidad de beneficiarios asignados a talleres sobre el total de registrados en la plataforma.
- **Horas Acreditadas de Vinculación y Práctica:** Suma de horas acumuladas de pasantes en docencia, podcasts e investigación.
- **Satisfacción Promedio:** Promedio sobre 5.0 obtenido en encuestas de satisfacción.
- **Audiencia de Difusión:** Alcance semestral acumulado en eventos y podcasts.
- **Investigadores Vinculados:** Estudiantes de la carrera vinculados a procesos de investigación (con módulo asignado o actividades reportadas).
- **Contribuciones Académicas:** Desglose por tipo de publicaciones (artículos regionales, alto impacto, libros, capítulos, memorias y propiedad intelectual).

---

## 🛠️ Gestión del Sitio (contenido público)

Distinto de todo lo anterior — es para editar el contenido de la página pública (miembros del equipo, publicaciones, videos, noticias, documentos). Tarjeta **"Gestión del Sitio"** → `/admin`, requiere el mismo login del Portal con el módulo `contenido_sitio` — **restringido solo a Arturo Rodríguez y Jhonny Villafuerte** (líder/colíder de este proyecto), no es lo mismo que el módulo `admin` de Indicadores.

**Ocultar un registro sin borrarlo:** en Noticias, Actividades, Publicaciones, Podcast y Miembros, la columna verde/gris de la tabla (según el módulo dice "Visible en el sitio", "Visible en /noticias" o "Visible en /actividades") es un botón — un clic lo saca de la página pública al instante, sin perder el registro ni su contenido; otro clic lo vuelve a mostrar. Es distinto de **Eliminar**, que sí borra la fila para siempre. La columna "Destacado" (en Noticias y Podcast) también es clickeable directo desde la tabla, sin necesidad de abrir "Editar".

**Buscar y paginar:** arriba de cada tabla hay un cuadro de búsqueda (filtra por título, autor, descripción, email, etc.) y un selector de "Mostrar 10/25/50/100 por página" — útil cuando la lista crece. Abajo de la tabla, "Anterior"/"Siguiente" para moverse entre páginas.

**Banco de Fotos:** sección "Fotos" del panel — sube una imagen, ponele un título y elegí dónde aparece (hoy: portada del sitio, carrusel principal). Ocultar/mostrar/eliminar funciona igual que el resto de tablas.

**Proyectos:** sección "Proyectos" del panel — ocultá o reordená cualquier proyecto o red (incluida RED LEA) del menú del sitio sin necesidad de pedirle a un programador que edite código. También podés crear un proyecto nuevo completo (portada, texto de integración, contacto) si es del tipo simple — los proyectos con página propia más elaborada (RED LEA, Vinculación, Docencia, Internacionalización) solo se pueden ocultar/reordenar desde acá, su contenido interno sigue necesitando a un programador.

---

## 🔐 Superadmin

Módulo aparte, restringido a una sola cuenta (hoy: Arturo) — acceso directo a explorar y modificar cualquier tabla de la base de datos, y ejecutar consultas SQL. No es para uso operativo del día a día, es una herramienta de mantenimiento técnico.

---

## Nota para quien ya tenía cuenta antes de agosto 2026

El sistema de asistencia viejo (con cuentas de Andy Castillo, Josselyn Mera y Ailys Bailón) fue reemplazado — esas cuentas quedaron huérfanas y sus contraseñas no se pueden recuperar. Si eras parte de ese grupo, **regístrate de nuevo** como el rol que te corresponda (ver tabla al inicio del manual).
