# Referencia de Base de Datos para Usuarios y Vinculación

Este documento describe el esquema de base de datos Neon Postgres y las relaciones utilizadas para gestionar usuarios, estudiantes, contraseñas y actividades de vinculación en **carreraPINE**.

---

## 1. Conexión a la Base de Datos

* **Motor:** Neon Postgres (Serverless Postgres).
* **Driver en JS:** `@neondatabase/serverless` (`neon(process.env.DATABASE_URL)`).
* **Variables de Entorno:** `DATABASE_URL` ubicada en `.env.local`.

---

## 2. Tablas Principales

### `usuarios`
Almacena todos los usuarios del sistema (estudiantes/pasantes, profesores, beneficiarios, administradores).

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (int) | Identificador único del usuario |
| `nombres` | VARCHAR | Nombres del usuario |
| `apellidos` | VARCHAR | Apellidos del usuario |
| `email` | VARCHAR | Correo institucional o personal (ej. `estudiante@live.uleam.edu.ec`) |
| `cedula` | VARCHAR | Número de cédula (puede estar `null` si la cédula está embebida en el email `e<cedula>@...`) |
| `password_hash` | VARCHAR | Hash bcrypt de la contraseña |
| `rol` | VARCHAR | Rol del usuario (`estudiante`, `profesor`, `beneficiario`, `admin`) |
| `activado` | BOOLEAN | Indica si la cuenta está activa (`true` / `false`) |
| `modulos_acceso` | JSONB/ARRAY | Lista de módulos con permisos |
| `creado_en` | TIMESTAMP | Fecha de registro |

---

### `espacio_instructores`
Asocia los estudiantes/pasantes de vinculación como instructores de espacios de enseñanza.

| Columna | Tipo | Descripción |
|---|---|---|
| `espacio_id` | INT | Referencia a `espacios_enseñanza.id` |
| `usuario_id` | INT | Referencia a `usuarios.id` |

---

### `espacios_enseñanza`
Talles, proyectos o clubes de vinculación o docencia.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (int) | ID del espacio |
| `nombre` | VARCHAR | Nombre del taller/club (ej. `Speaking Club - Inicial Bilingüe`) |
| `tipo` | VARCHAR | Tipo de espacio (`comunidad`, etc.) |
| `area` | VARCHAR | Área (`vinculacion`, etc.) |
| `profesor_id` | INT | ID del profesor responsable en `usuarios.id` |
| `ciclo_id` | INT | ID del ciclo académico en `ciclos_academicos.id` |

---

### `ciclos_academicos`
Ciclos del periodo académico (ej. `2026-2`).

---

### Tablas de Actividades de Pasantes
* `actividades_investigacion_pasante`: Registro de actividades de investigación o pasantía (`usuario_id`, etc.).
* `horas_podcast_pasante`: Horas reportadas en proyectos de podcast (`usuario_id`, `tema`, `horas`, `fecha`).
* `asistencia_instructores`: Control de asistencia de pasantes en talleres.

---

## 3. Autenticación y Cifrado de Contraseñas

* **Algoritmo:** Bcrypt mediante la librería `bcryptjs`.
* **Rounds / Salt:** 10 rounds.
* **Reseteo manual en script:**
  ```javascript
  import bcrypt from 'bcryptjs';
  const newHash = await bcrypt.hash(newPassword, 10);
  await sql`UPDATE usuarios SET password_hash = ${newHash}, activado = true WHERE id = ${userId}`;
  ```
* **Verificación de Login:**
  ```javascript
  const isValid = await bcrypt.compare(password, user.password_hash);
  ```

