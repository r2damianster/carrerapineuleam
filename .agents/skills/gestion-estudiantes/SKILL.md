---
name: gestion-estudiantes
description: >-
  Procedimiento y utilidades para buscar datos de estudiantes, consultar información de vinculación, revisar espacios de enseñanza asignados y resetear contraseñas con bcrypt en la base de datos Neon Postgres del proyecto carreraPINE.
---

# Gestión de Estudiantes y Vinculación (carreraPINE)

Esta skill proporciona las instrucciones y scripts automatizados para consultar y administrar la información de estudiantes, verificar su participación en proyectos/talleres de vinculación y resetear o actualizar sus contraseñas en **carreraPINE**.

---

## 🛠️ Herramientas y Scripts Disponibles

El proyecto cuenta con un script de administración listo para ejecutarse mediante Node.js:

```bash
node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs <comando> <argumentos>
```

---

## 📋 Guía de Procedimientos paso a paso

### 1. Buscar un Estudiante por Correo, Cédula, ID o Nombre

Para verificar la existencia de un estudiante o encontrar su correo / cédula / ID:

```bash
node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs buscar <termino_busqueda>
```

**Ejemplos:**
* Buscar por cédula o número en el correo: `node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs buscar 1314687524`
* Buscar por correo: `node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs buscar estudiante@live.uleam.edu.ec`
* Buscar por nombre: `node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs buscar "Barbara Roca"`

---

### 2. Consultar Datos y Actividades de Vinculación

Para revisar en qué proyectos, talleres o clubes de vinculación está asignado un estudiante y ver sus horas/actividades reportadas:

```bash
node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs vinculacion <email_cedula_o_id>
```

**Ejemplo:**
```bash
node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs vinculacion 49
```

**Información que devuelve:**
* Datos personales (Nombre, Email, Rol, ID).
* Espacios de enseñanza/vinculación asignados (Nombre del taller, Área, Profesor responsable, Ciclo académico).
* Registro de actividades de pasante e historial de horas de podcast/talleres.

---

### 3. Resetear o Cambiar la Contraseña de un Estudiante

Para cambiar la contraseña de un estudiante a una nueva clave deseada (cifrada automáticamente con `bcryptjs` salt 10 y activando su cuenta):

```bash
node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs reset-password <email_cedula_o_id> <nueva_clave>
```

**Ejemplo:**
```bash
node .agents/skills/gestion-estudiantes/scripts/gestionar-estudiante.mjs reset-password estudiante@live.uleam.edu.ec <NuevaClaveTemporal>
```

---

## 📖 Documentación Complementaria

Para obtener más detalles sobre la estructura de las tablas, relaciones y cifrado:
* [Referencia de Base de Datos y Esquema](./references/base-de-datos.md)

