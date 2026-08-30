# 🎓 Proyecto Innovaciones Pedagógicas e Internacionalización - ULEAM (PINE)

Aplicación web integral para la gestión y seguimiento de indicadores del Proyecto de Innovación e Internacionalización en la Universidad Laica Eloy Alfaro de Manabí (ULEAM).

**Versión:** 1.0.0  
**Estado:** ✅ Sistema PINE Operativo (Cloudinary + Neon Postgres)  
**Tech Stack:** Next.js 14 (App Router) + TypeScript + TailwindCSS + Neon (Postgres Serverless) + Cloudinary

**Repositorio:** https://github.com/r2damianster/carrerapineuleam.git

---

## 🌟 Características Implementadas (Sistema PINE)

El proyecto abandonó el uso de mocks/PocketBase para escalar hacia una arquitectura puramente relacional en la nube. Se implementaron los **5 Módulos Core** para medir los indicadores PINE:

### 1. Registro Seguro y Roles
- Frontend de registro dinámico según rol (`/registro`).
- Separación de perfiles: Estudiante de Vinculación, Beneficiario, y Profesor.
- Captura de información investigativa para estudiantes vinculados.
- Contraseñas protegidas mediante hash (`bcryptjs`).

### 2. Test MCER (Pre y Post)
- Herramienta para medir el avance de nivel de inglés (`/vinculacion/test-mcer`).
- Batería dinámica de 20 preguntas (A1 - B2).
- Exportación automática a formato **Microsoft Word** (`.docx`) para pruebas físicas.
- Carga de **evidencia fotográfica** directamente a Cloudinary.

### 3. Panel de Difusión
- Registro de Podcasts, Eventos Físicos y Encuentros Comunitarios (`/vinculacion/difusion`).
- Monitoreo directo de la variable de "Audiencia Alcanzada".
- Subida obligatoria de evidencia/métrica fotográfica.

### 4. Gestión Docente
- Panel de administración para Arturo y Cynthia (`/docencia`).
- **Creación de Aulas/Espacios** vinculados a un ciclo semestral.
- **Asignación Masiva** de beneficiarios inscritos.
- **Calificaciones:** Grilla de notas (0.0 a 5.0) para medir beneficiarios aprobados.

### 5. Encuestas de Satisfacción
- Panel interactivo para el control de calidad (`/vinculacion/encuesta`).
- Calificación por estrellas (1 a 5) y comentarios directos.

### 6. Dashboard Estadístico (Gerencia)
- Pantalla analítica en tiempo real (`/pine-dashboard`).
- KPIs conectados a Neon para evaluar de un vistazo:
  - Participantes mejorados MCER (Meta: 100)
  - Aprobados > 4.0 (Meta: 25)
  - Satisfacción Promedio (Meta: 70%)
  - Audiencia Alcanzada (Meta: 50)
  - Estudiantes Investigadores (Meta: 6)

---

## 🚀 Cómo Empezar (Desarrollo Local)

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Cuenta en [Neon.tech](https://neon.tech) (PostgreSQL Serverless)
- Cuenta en [Cloudinary](https://cloudinary.com)

### Configuración Rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# Crea un archivo .env.local en la raíz con el siguiente formato:
DATABASE_URL="postgresql://usuario:password@host/db_name?sslmode=require&channel_binding=require"
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"

# 3. Inicializar la base de datos (Ejecutar las migraciones)
node --env-file=.env.local scripts/migrate.js

# 4. Iniciar en desarrollo
npm run dev
```

### Acceso Directo a los Módulos
Al arrancar el servidor en `http://localhost:3000`, la página de inicio incluye un bloque de navegación azul con accesos directos a todos los submódulos PINE.

---

## 🗄️ Esquema de Base de Datos (Neon Postgres)

La aplicación utiliza un modelo relacional de 11 tablas interconectadas:
- `usuarios` / `perfiles_estudiantes` / `perfiles_beneficiarios`
- `ciclos_academicos` / `espacios_enseñanza` / `inscripciones_espacio` / `calificaciones_ciclo`
- `evaluaciones_mcer` / `encuestas_satisfaccion`
- `actividades_difusion` / `asistencias_eventos`

Para ver los scripts de creación de tablas, revisa `scripts/migrate.js`.

---

## 👥 Equipo del Proyecto

- **Líder**: Arturo Rodríguez - arturo.rodriguez@uleam.edu.ec
- **Colíder**: Jhonny Villafuerte - jhonny.villafuerte@uleam.edu.ec

---

## 📚 Documentación

| Archivo | Descripción |
|---------|-------------|
| `brain/implementation_plan.md` | Arquitectura detallada, DB Schema y flujos |
| `brain/walkthrough.md` | Resumen de los logros y pasos dados en la última iteración |
| `brain/task.md` | Lista de tareas y checklist completado al 100% |
| `README.md` | Este archivo |
