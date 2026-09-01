# Plan de Implementación – Módulo de Contribuciones de Carrera (Actualizado)

## Descripción del objetivo

Incorporar en la aplicación **carreraPINE** un módulo que permita a los docentes registrar sus aportes académicos (artículos regionales, artículos de alto impacto, libros, capítulos de libro, publicaciones en memoria de eventos y propiedad intelectual). Los datos quedarán almacenados en la base de datos **Neon PostgreSQL** y serán visibles **solo para usuarios con rol *admin***, quien también podrá eliminarlos.

## Arquitectura existente (resumen)

- **Frontend**: Next.js (app/*) con React, Tailwind y componentes reutilizables.
- **API**: Rutas API de Next.js (`app/api/*`). Ya existen endpoints de autenticación, subida de archivos y difusión.
- **Auth**: Sesión basada en cookies, endpoint `/api/auth/me` que devuelve `usuario.rol`.
- **Base de datos**: Actualmente no hay DB relacional; utilizaremos **Neon** (PostgreSQL serverless) mediante **Prisma**.
- **Estilos**: Mantener los estilos actuales (Tailwind, Material‑UI) sin cambios.

## Decisiones clave acordadas

| Tema | Decisión |
|------|----------|
| **Base de datos** | **Neon PostgreSQL** con Prisma como ORM. |
| **Visibilidad** | Las contribuciones son **solo visibles para admin**. Los docentes pueden crear, pero no ver sus propios registros; solo el admin los lista y los elimina. |
| **Eliminación** | **Borrado definitivo** (hard delete) por parte del admin. No se implementa eliminación suave. |
| **Exportación** | Se implementará en una fase posterior; por ahora no se incluye. |
| **Subida de archivos** | No se permite subir PDFs ni archivos; solo se capturan los datos. |
| **Campo `INTERCULTURAL`** | Opcional (campo libre). |
| **`CODIGO_IES`** | Siempre se guarda el literal "ULEAM" (campo oculto en la UI). |
| **Línea de investigación** | Lista fija proporcionada (ver sección *Líneas de investigación*). Si el usuario elige "Otro", se despliega un *select* con la lista adicional de líneas que proporcionó. |
| **Estado de publicación** | Se añaden dos columnas a todas las tablas de contribución: `fecha_subida` (timestamp) y `validado_por` (referencia a admin, nullable) + `fecha_validacion` (nullable). En futuro, solo las entradas con `validado_por` distinto de null aparecerán en la web de la carrera. |
| **Autores** | Se modelará una tabla vinculada **ContributionAuthor** con los campos:
- `contribution_id`
- `author_name`
- `order` (1‑5)
- `is_carrera_author` (booleano, indica si pertenece a la carrera).
El docente que registra la aportación deberá indicar el **número de orden** del autor que lo representa (ej. "primer autor", "segundo autor", …). Se permitirán autores externos al registro de la carrera.

## Preguntas abiertas

> [!CAUTION]
> *¿Todo claro con la tabla de autores y el flujo de captura del número de orden?*
> *¿Desea que el admin también pueda crear publicaciones bajo la etiqueta "Administración" (solo admin) o que esa etiqueta sea automática?*

## Campos obligatorios y opcionales por tipo de contribución

| Tipo | Campos obligatorios (comunes) | Campos específicos obligatorios | Opcionales |
|------|-------------------------------|--------------------------------|------------|
| **Artículos regionales** | `CODIGO_IES`, `FACULTAD`, `CARRERA`, `TIPO_PUBLICACION`, `TIPO_ARTICULO`, `CODIGO_PUBLICACION`, `TITULO_PUBLICACION`, `FECHA_PUBLICACION`, `CAMPO_DETALLADO`, `ESTADO`, `LINEA_INVESTIGACION` | `BASE_DATOS_INDEXADA`, `CODIGO_ISSN`, `NOMBRE_REVISTA`, `LINK_PUBLICACION`, `LINK_REVISTA`, `FILIACION`, `IDENTIFICACION_PARTICIPANTE`, `CATEGORIA`, `PARTICIPACION`, `CUARTIL` | `INTERCULTURAL` |
| **Artículos de alto impacto** | mismos que arriba | idénticos | `INTERCULTURAL` |
| **Libros** | `CODIGO_IES`, `FACULTAD`, `CARRERA`, `TIPO_PUBLICACION`, `CODIGO_PUBLICACION`, `TITULO_LIBRO`, `FECHA_PUBLICACION`, `CAMPO_DETALLADO`, `LINEA_INVESTIGACION` | `CODIGO_ISBN`, `REVISADO_PARES`, `FILIACION`, `IDENTIFICACION_PARTICIPANTE`, `PARTICIPACION` | `INTERCULTURAL` |
| **Capítulos de libro** | `CODIGO_IES`, `FACULTAD`, `CARRERA`, `TIPO_PUBLICACION`, `CODIGO_PUBLICACION`, `TITULO_CAPITULO`, `TITULO_LIBRO`, `FECHA_PUBLICACION`, `CAMPO_DETALLADO`, `LINEA_INVESTIGACION` | `CODIGO_ISBN`, `EDITOR_COMPILADOR`, `PAGINAS`, `FILIACION`, `IDENTIFICACION_PARTICIPANTE`, `PARTICIPACION`, `TOTAL_CAPITULO_LIBRO` | `INTERCULTURAL` |
| **Publicaciones Memoria Eventos** | `CODIGO_IES`, `FACULTAD`, `CARRERA`, `TIPO_PUBLICACION`, `TIPO_ARTICULO`, `CODIGO_PUBLICACION`, `NOMBRE_PONENCIA`, `NOMBRE_EVENTO`, `EDICION_EVENTO`, `ORGANIZADOR_EVENTO`, `COMITE_ORGANIZADOR`, `PAIS`, `CIUDAD`, `FECHA_PUBLICACION`, `CAMPO_DETALLADO`, `LINEA_INVESTIGACION` | `IDENTIFICACION_PARTICIPANTE`, `PARTICIPACION` | `INTERCULTURAL` |
| **Propiedad intelectual** | `CODIGO_IES`, `FACULTAD`, `CARRERA`, `TIPO_PUBLICACION`, `LINEA_INVESTIGACION` | `CERTIFICADO_N`, `SOLICITUD_N`, `AUTOR(es)`, `TITULAR(es)`, `CLASE_DE_OBRA`, `TITULO_OBRA`, `LUGAR`, `FECHA` | `INTERCULTURAL` |

## Modelo de datos (Prisma) – Resumen

```prisma
model Contribution {
  id                String   @id @default(cuid())
  codigo_ies        String   @default("ULEAM")
  facultad          String
  carrera           String
  tipoPublicacion   TipoPublicacion
  tipoArticulo      String?   // solo para artículos
  codigoPublicacion String?
  proyecto          String?
  titulo            String
  tituloLibro       String?   // para libros/capítulos
  nombreRevista     String?   // para artículos
  issn              String?   // opcional
  isbn              String?   // para libros/capítulos
  fechaPublicacion  DateTime
  campoDetallado    String
  estado            String
  linkPublicacion   String?
  linkRevista       String?
  filiacion         String?
  identificacionParticipante String?
  categoria         CategoriaDocente?
  participacion     String?
  cuartil           String?
  lineaInvestigacion String
  intercultural     String?
  fechaSubida       DateTime @default(now())
  validadoPor       String?   // id del admin validador
  fechaValidacion   DateTime?
  // Relaciones
  authors           ContributionAuthor[]
}

model ContributionAuthor {
  id               String   @id @default(cuid())
  contributionId   String
  contribution     Contribution @relation(fields: [contributionId], references: [id])
  authorName       String
  order            Int      // 1..5
  isCarreraAuthor  Boolean
}

enum TipoPublicacion {
  ARTICULO_REGIONAL
  ARTICULO_ALTO_IMPACTO
  LIBRO
  CAPITULO_LIBRO
  MEMORIA_EVENTO
  PROPIEDAD_INTELECTUAL
}

enum CategoriaDocente {
  AUXILIAR_I
  AUXILIAR_II
  AGREGADO_I
  AGREGADO_II
  PRINCIPAL_I
  PRINCIPAL_II
}
```

## Implementación Backend

1. **Instalar Prisma** y conectar con Neon.
   ```bash
   npm install prisma @prisma/client
   npx prisma init --datasource-provider postgresql
   # En .env colocar la URL de Neon
   ```
2. Definir el esquema anterior y ejecutar migraciones.
3. Crear rutas API en `app/api/contribuciones`:
   - `GET /api/contribuciones` → solo admin (middleware verifica `rol === 'admin'`). Devuelve listado.
   - `POST /api/contribuciones` → cualquier docente autenticado puede crear; el backend asigna `codigo_ies = "ULEAM"`, `fecha_subida = now()`. Se valida el cuerpo con **Zod** contra el esquema Prisma; se incluye lógica para capturar **orden del autor** y crear registros en `ContributionAuthor`.
   - `DELETE /api/contribuciones/[id]` → solo admin; realiza borrado definitivo.
4. **Middleware de autorización** (`app/api/_middleware.ts`) que verifica sesión y añade `req.user` con `rol` y `id`.
5. **Validaciones**:
   - Campos obligatorios según tipo (ver tabla arriba).
   - `linea_investigacion` must be one of the fixed list; if user selects `Otro`, el frontend enviará la línea elegida de la lista adicional.
   - `intercultural` es opcional.
   - El número de autor (orden) se recibe como `authorOrder` y se usa para crear el registro del autor principal; los demás autores pueden ser añadidos mediante un array `additionalAuthors` (nombre + isCarreraAuthor flag).

## Implementación Frontend

1. **Página de gestión** (`app/contribuciones/page.tsx`): listado tabular visible **solo para admin** (verifica rol). Botón de *Eliminar* en cada fila.
2. **Wizard de registro** (`app/contribuciones/new/[type]/page.tsx`):
   - Paso 1: Selección de tipo (tarjetas).
   - Paso 2: Formulario con campos comunes y dinámicos según tipo.
   - Campo *Línea de investigación*: selector con las 12 líneas predeterminadas; opción "Otro" despliega segundo selector con la lista adicional que el usuario proporcionó.
   - Campo *Autor principal*: input de texto para nombre y **selector de orden** (1‑5). Al seleccionar el orden, el sistema asume que ese autor pertenece a la carrera (marca `isCarreraAuthor = true`). Se pueden añadir autores adicionales mediante botón "Agregar autor" que abre un sub‑formulario (nombre + checkbox "Autor de la carrera").
   - Campo *INTERCULTURAL*: input libre (opcional).
   - Al enviar, el cliente envía JSON con la estructura esperada por la API.
3. **Reutilizar componentes** existentes (inputs, selects, botones) y estilos actuales.
4. **Validación cliente** con React Hook Form + Yup (esquema generado a partir de los tipos). Mostrar errores claros.
5. **Control de visibilidad**: En el frontend, usar `useEffect` para consultar `/api/auth/me` y redirigir a login si no está autenticado; si el rol no es `admin`, la página de listado mostrará un mensaje de “Acceso restringido”.

## Exportación futura

- Endpoint `GET /api/contribuciones/export?format=csv` (pendiente).
- Campo `validado_por` será usado para filtrar sólo los registros validados en la web de la carrera.

## Pruebas

- **Backend**: Jest + Supertest para cada endpoint; pruebas de autorización, validación de campos obligatorios y creación de autores.
- **Frontend**: Jest + React Testing Library para componentes del wizard; Cypress para flujo completo (login docente → crear contribución → verificar que solo admin la ve).
- Cobertura objetivo: ≥80 % backend, ≥70 % frontend.

## Verificación Manual

1. Levantar entorno con Docker Compose (incluye container Neon mediante `docker run` de Neon o usar la URL de Neon).
2. Crear cuenta docente y admin; probar registro de contribución.
3. Ingresar como admin y confirmar que la tabla muestra la nueva fila y permite eliminarla.
4. Verificar en la base de datos que `codigo_ies` = "ULEAM", que `fecha_subida` está poblada y que la tabla `ContributionAuthor` contiene los autores con su orden.
5. Probar la lógica de "Otro" en Línea de investigación.

---

**Próximos pasos**
1. Confirmar que el esquema de autores y la captura del número de orden son correctos para ustedes.
2. Con su visto bueno, crearé los archivos de Prisma, las rutas API y el wizard de UI.
3. Añadiré los tests y la CI.
4. Desplegaré en un entorno de pruebas para que lo revisen.
