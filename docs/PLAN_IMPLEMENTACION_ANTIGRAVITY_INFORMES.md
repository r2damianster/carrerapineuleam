# Plan de implementación (handoff a Antigravity): Informes automáticos de Vinculación

> Complementa `docs/PLAN_INFORMES_VINCULACION.md` (análisis y esquema). Este documento es el **plan de ejecución paso a paso** para llevarlo a producción.
> Formatos fuente (raíz del repo): `Informe de Avances y Logros Proyecto (Presidente-Lider).docx`, `Informe de Seguimiento de Tareas (Supervisor).docx`.

## 0. Alcance y decisiones ya tomadas
- **Informe Supervisor: mensual.** **Informe Líder: semestral** (= `ciclos_academicos`).
- Objetivos, actividades, metas, presupuesto y textos cualitativos viven en Neon (reutilizables por ciclo).
- Beneficiarios indirectos = meta proyectada (campo de la ficha). Zona fija "Distrito 13D02 Manta" + N.º y nombres de espacios en ejecución del ciclo.
- Fotos: salen de `asistencia_espacio.foto_url` (sesiones **aprobadas**, elegidas por el supervisor).
- Gráficos incluidos en el .docx. Dependencia nueva aceptada (ver WP7 para el spike).
- Salida: `.docx` descargable, con vista previa editable antes de generar, e historial.

## 1. Reglas de oro (de CLAUDE.md — no negociables)
1. Antes de `git push` con `.ts/.tsx`: `npx tsc --noEmit` **y** `npm run build` pasan local. Nunca objetos de estado con claves duplicadas.
2. `neon()` **nunca a nivel de módulo**; en GET públicos sin sesión `{ fetchOptions: { cache: 'no-store' } }`. Estas rutas exigen sesión, pero declarar `export const dynamic = 'force-dynamic'`.
3. Migraciones: a mano (`scripts/migrate-*.js`, plantilla `scripts/migrate-topes-horas.js`), auditar `information_schema` **antes**, aplicar en Neon (proyecto `dark-feather-21824720`) y **verificar con SELECT después**. **Nunca** `prisma db push/migrate`.
4. Si un cambio agrega valor a CHECK/enum que vive en BD → migrar BD en el mismo cambio y probar el flujo real (lección "Ver como").
5. i18n / nombres descriptivos: nada de `s`, `i`, `val`; texto visible con `t('clave')` en el sitio público. Las pantallas del portal en español fijo, como el resto de `/vinculacion/*`.
6. Toda función que deje algo pendiente → regla en `lib/notificaciones.ts` + fila en `NOTIFICACIONES.md`.
7. Permisos: usar `lib/modulos.ts` (`puedeGestionarVinculacion`, `puedeSupervisarVinculacion`). **No** listas de emails. Alcance del supervisor con `lib/alcanceSupervision.ts` (supervisor de un pasante = `profesor_id` de sus espacios). Bajo "Ver como" los chequeos usan la identidad suplantada.
8. Cuota de Vercel (~300 funciones por deploy): cada `route.ts` es una función. Consolidar endpoints (ver WP4/WP8) y no crear más de los necesarios. Commits solo `.md/docs/` no despliegan.
9. Tras push: `list_deployments` en Vercel → `READY`; si `ERROR`, leer `list_deployment_events` y corregir.
10. No commitear sin instrucción del usuario. Trabajo en rama, un PR por fase.

## 2. Orden de trabajo (paquetes)

| WP | Contenido | Depende de | Fase |
|---|---|---|---|
| WP0 | Preparación y auditoría | — | 1 |
| WP1 | Migración de BD | WP0 | 1 |
| WP2 | Género en registros + backfill | WP1 (no requiere columnas nuevas) | 1 |
| WP3 | Capa de datos de informes (`lib/`) | WP1 | 2 |
| WP4 | Pantalla `/vinculacion/proyecto` (ficha, objetivos, plan, presupuesto, textos) | WP1 | 1 |
| WP5 | Captura operativa (vínculo sesión→actividad, no prevista, comentario, usar_en_informe, obstáculos) | WP1, WP4 | 2 |
| WP6 | Plantillas .docx | WP3 | 2-3 |
| WP7 | Gráficos (spike + implementación) | WP3 | 2 |
| WP8 | Generación y pantalla `/vinculacion/informes` (Supervisor) | WP3, WP5, WP6, WP7 | 2 |
| WP9 | Informe Líder | WP8 | 3 |
| WP10 | Notificaciones | WP8 | 4 |
| WP11 | Documentación, pruebas, despliegue | todo | cada fase |

Cada fase es desplegable sola. **Fase 1 = WP0-WP2 + WP4. Fase 2 = WP3, WP5-WP8. Fase 3 = WP9. Fase 4 = WP10.**

---

## WP0 — Preparación
1. `git fetch` + `git log origin/main..HEAD` (Antigravity/Claude trabajan en paralelo). Crear rama `feat/informes-vinculacion`.
2. Mover los 2 .docx de la raíz a `app/utilidades/_templates/` con estándar de nombres: `Informe_Vinculacion_Lider.docx` y `Informe_Vinculacion_Supervisor.docx` (invocar skill `estandar-archivos`; los originales quedan **sin borrar** hasta terminar WP6).
3. Auditoría BD (solo lectura): `information_schema.columns` de `asistencia_espacio`, `espacios_enseñanza`, `proyectos`, `usuarios`, y confirmar que **no** existen ya las tablas del WP1 (`proyecto_ficha`, etc.).
4. Snapshot Neon (`create_snapshot`) antes de migrar.
5. Confirmar con el usuario si entrega el documento del proyecto para sembrar (ver WP4.6).

## WP1 — Migración de BD
Archivo: `scripts/migrate-informes-vinculacion.js` (plantilla `migrate-topes-horas.js`; idempotente con `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`). DDL completo en `docs/PLAN_INFORMES_VINCULACION.md` §"Esquema nuevo". Ajustes al aplicarlo:
- `proyecto_ficha`: agregar `firmante_responsable_id INT REFERENCES usuarios(id)` (Responsable de Vinculación y Emprendimiento) y `lider_id` derivable de `proyectos.lider_email` (no duplicar).
- `proyecto_ficha`: **una fila por proyecto**; vigencia por campos. Si en el futuro hay varios ciclos con metas distintas, migrar a `(proyecto_id, ciclo_id)`. Decisión ahora: metas por ciclo van en `proyecto_metas_ciclo(proyecto_id, ciclo_id, meta_estudiantes, meta_docentes, meta_beneficiarios_directos, meta_beneficiarios_indirectos)` **en lugar de** columnas de meta en la ficha (las metas sí cambian por semestre; la ficha no). Ajustar el DDL del plan.
- Índices: `proyecto_objetivos(proyecto_id)`, `proyecto_actividades_plan(objetivo_id)`, `proyecto_actividades_plan(ciclo_id)`, `asistencia_espacio(actividad_plan_id)`, `supervision_obstaculos(supervisor_id, mes)`, `informes_vinculacion(tipo, ciclo_id, mes)`.
- `informes_vinculacion.tipo` con CHECK (`lider`,`supervisor`). Constraint único `(tipo, supervisor_id, ciclo_id, mes)` para no duplicar (con `COALESCE` vía índice único parcial o columnas NOT NULL con 0).
- Semilla mínima: una fila `proyecto_ficha` para `proyectos.id='vinculacion'` con `zona='Distrito 13D02 Manta'`, `unidad_academica` y `carrera` (confirmar texto exacto con el usuario, no inventar).
- Aplicar en Neon vía MCP `run_sql`/`run_sql_transaction` (una transacción), luego SELECT de verificación de columnas y constraints.
- Rollback: `scripts/rollback-informes-vinculacion.js` (DROP TABLE de las nuevas y DROP COLUMN de las 4 columnas de `asistencia_espacio`) — guardarlo pero no ejecutarlo salvo fallo.
- **Aceptación:** tablas y columnas existen; `SELECT count(*)` de cada una = 0 (salvo semilla); ninguna tabla preexistente cambió.

## WP2 — Género de beneficiarios
Valores válidos ya existentes: `femenino | masculino | otro | prefiero_no_decir` (`app/api/perfil/route.ts`, `app/api/auth/register/route.ts`).
1. `POST /api/beneficiarios/registrar-y-evaluar` (`INSERT INTO usuarios` línea ~52): aceptar `genero` (obligatorio, validar contra la lista) y guardarlo.
2. `app/api/enlaces/[token]/pretest/route.ts` (línea ~108): igual, y en la rama "ya registrado" **no** sobrescribir género si ya existe (sí completarlo si es NULL).
3. UI: agregar `<select>` Género en `/vinculacion/registrar-evaluar` y `/vinculacion/publico/[token]` (pretest). Sin abreviaturas crípticas en nombres de variables.
4. Backfill de los 69 existentes: pantalla de edición masiva (tabla de beneficiarios con select por fila, guardar por lote) en `/vinculacion/pasantes`-estilo, bajo `puedeGestionarVinculacion`; endpoint `PATCH /api/beneficiarios/genero` (recibe `[{id, genero}]`, valida rol beneficiario). Alternativa: hoja Excel cargada con `xlsx` (patrón de `estudiantes/bulk`, con `dryRun`).
5. **Aceptación:** registrar un beneficiario nuevo por panel y por QR guarda género; `SELECT count(*) FROM usuarios WHERE rol='beneficiario' AND genero IS NULL` decrece hasta 0 tras el backfill; el informe no cuenta NULL (los muestra como "Sin dato").

## WP3 — Capa de datos (`lib/informesVinculacion.ts`)
Funciones puras que reciben `sql` (cliente creado dentro del handler) y devuelven JSON serializable (mismo objeto que se guarda en `informes_vinculacion.datos_json` y se pinta en la vista previa):

- `resolverPeriodo({tipo, cicloId, mes})` → `{ desde, hasta, etiqueta }`. Supervisor: primer y último día del mes. Líder: fechas de `ciclos_academicos`.
- `datosInformeSupervisor(sql, {supervisorId, mes})`:
  - `general`: proyecto (`proyectos`, `proyecto_ficha`), supervisor, ciclo del mes, `estudiantes_supervisados` (distintos `espacio_instructores.usuario_id` de espacios con `profesor_id = supervisorId`), beneficiarios (`inscripciones_espacio`), zona + espacios (nombres).
  - `tareas`: por espacio y por `actividad_plan` → sesiones **aprobadas** del mes, % avance (sesiones realizadas / sesiones esperadas si hay plan; si no hay plan, solo conteo), N.º pasantes distintos (`asistencia_instructores`), productos sociales (beneficiarios atendidos) y académicos (horas acreditadas de pasantes; `horas_asistencia_instructor`), observaciones (`comentario_supervisor`).
  - `no_previstas`: mismas columnas con `no_prevista = true`.
  - `participacion`: pasantes por espacio con horas del mes y acumuladas vs. tope (`topes_horas_pasante`, `lib/topesHoras.ts`); beneficiarios por género (`usuarios.genero`) y edad (`perfiles_beneficiarios.edad`) **solo de sus espacios**.
  - `obstaculos`: `supervision_obstaculos` del mes.
  - `fotos`: sesiones aprobadas con `usar_en_informe = true` (máx. 12) con pie (espacio, fecha, beneficiarios presentes, pasantes presentes).
- `datosInformeLider(sql, {cicloId})`: igual, sobre **todos** los espacios del proyecto; más `objetivos` + `actividades_plan` con estado, participación plan vs. ejecutado (`proyecto_metas_ciclo`), beneficiarios directos (real) / indirectos (meta), MCER pre→post (`evaluaciones_mcer`, ganancia por subnivel), satisfacción (`encuestas_satisfaccion` promedio por dimensión + `encuesta_evaluaciones_instructor`), presupuesto (`proyecto_presupuesto` + % ejecución), textos (`proyecto_textos_ciclo`), evolución mensual acumulada.
- Reglas de cálculo (documentarlas en el archivo): contar solo `estado_aprobacion='aprobado'`; usar `horasContables` de `lib/topesHoras.ts` para no exceder tope; rangos de edad fijos (`<18`, `18-25`, `26-35`, `36-50`, `>50`, `Sin dato`); fechas en zona `America/Guayaquil`.
- Rendimiento: 1 consulta agregada por bloque (no N+1); todas dentro de un `Promise.all`.
- **Aceptación:** script `scratch/test-informe-datos.mjs` (gitignored) ejecuta ambas funciones contra Neon y verifica: sesiones del mes = suma por espacio; supervisor regular no ve espacios ajenos; líder ve todos; totales de género = total de beneficiarios inscritos.

## WP4 — Pantalla del proyecto (`/vinculacion/proyecto`) — solo líder
Ruta protegida en `middleware.ts` (`protectedRoutes` + regla de rol igual que `/vinculacion/topes-horas`: `puedeGestionarVinculacion`). Enlace en la tarjeta "Gestión de Vinculación" de `/portal/dashboard`.
Pestañas: **Ficha** · **Objetivos y actividades** · **Metas por ciclo** · **Presupuesto** · **Textos del ciclo**.
- API consolidada para ahorrar funciones: `app/vinculacion/proyecto/api/route.ts` con `GET ?seccion=` y `PUT`/`POST`/`DELETE` por sección (patrón de `app/investigacion/informes/api/*`). Validar con `zod` (ya en el repo).
- Ficha: todos los campos de `proyecto_ficha`; `zona` de solo lectura por defecto ("Distrito 13D02 Manta").
- Objetivos/actividades: CRUD con orden; actividad con objetivo, metodología, ciclo, rango de meses, espacio (opcional), responsable. Botón "**Copiar al ciclo siguiente**" (reutilización, requisito del usuario).
- Presupuesto: tabla editable, `% ejecución` calculado (`ejecutado/solicitado`), totales.
- Textos del ciclo: 7 claves con botón "Redactar borrador con IA" (reusar `app/utilidades/_lib/enriquecerTexto.ts`, agregar prompts nuevos por clave). El líder edita y guarda; la IA nunca escribe sin revisión.
- Auditoría de cambios: escribir en `superadmin_audit_log` con `crud_update` (evita nueva migración del CHECK), como `/admin/roles`.
- 4.6 Sembrado inicial: si el usuario entrega el documento del proyecto, script `scripts/seed-proyecto-vinculacion.js` con objetivos/actividades/presupuesto reales. **No inventar datos.** Si no lo entrega, dejar vacío.
- **Aceptación:** líder crea/edita/borra cada sección; supervisor y pasante reciben 403 en la API y redirección en la página; "Copiar al ciclo siguiente" duplica actividades sin duplicar objetivos.

## WP5 — Captura operativa
1. **`/vinculacion/asistencia`** (registro de sesión): selector opcional "Actividad del plan" (lista de `proyecto_actividades_plan` del ciclo del espacio, filtrada por `espacio_id` o sin espacio) y checkbox "Actividad no prevista". `POST /api/espacios/asistencia`: validar que `actividad_plan_id` pertenece al proyecto y al ciclo; si `no_prevista=true`, `actividad_plan_id` debe ser NULL.
2. **`/vinculacion/supervisar`** (pestaña Asistencia): campos "Comentario del supervisor" y "Usar en informe" (checkbox por foto) junto a Aprobar/Rechazar. `PATCH .../supervisar-asistencia/[id]`: aceptar `comentario_supervisor`, `usar_en_informe` (solo si estado aprobado; al rechazar se pone en false). Permisos: el supervisor solo de sus espacios (ya vigente, no relajar).
3. **Obstáculos:** nueva pestaña/sección en `/vinculacion/informes` (WP8) con CRUD sobre `supervision_obstaculos` del supervisor logueado.
4. **Aceptación:** una sesión registrada con actividad del plan aparece en la tabla del informe bajo esa actividad; una `no_prevista` aparece en "Actividades no previstas"; la foto marcada aparece en adjuntos, las no marcadas no.

## WP6 — Plantillas .docx
- Decisión técnica: generar con la librería **`docx`** (ya instalada, `lib/certificateDocx.ts` como referencia) en lugar de docxtemplater, porque las tablas tienen filas dinámicas, imágenes y celdas sombreadas (cronograma). Replicar **fielmente** el formato de los 2 archivos: encabezado en tabla (NOMBRE DEL DOCUMENTO / CÓDIGO / PROCEDIMIENTO / REVISIÓN / Página X de Y), logo ULEAM (extraer `word/media/image*.png` del .docx original y guardarlo en `app/utilidades/_templates/` o `lib/assets`), numeración de secciones, pie con imagen, bloque de firmas.
- Ojo con el encabezado original: tiene "Página 3 de 4" fijo → usar campos `PageNumber.CURRENT` / `NUMPAGES`. Los campos CÓDIGO/REVISIÓN salen de `proyecto_ficha` (`codigo_documento_*`, `revision_documento_*`).
- El texto del formato tiene títulos "FACULTAD DE ____" y "___ DE 2024": reemplazar por `unidad_academica` y período real. **Corregir el año fijo 2024.**
- Cronograma: tabla meses × actividades; celda sombreada si hubo sesiones aprobadas de esa actividad en el mes.
- Módulo: `app/vinculacion/informes/_lib/docxSupervisor.ts` y `docxLider.ts`, cada uno `construirDocumento(datos, graficos, fotos): Promise<Buffer>`.
- Fotos: descargar de Cloudinary con transformación `w_900,q_auto,f_jpg` (insertar en la URL tras `/upload/`), 2 por fila con pie; timeout 8 s por foto y omitir con aviso si falla (no tumbar el informe).
- **Aceptación:** abrir el .docx en Word y LibreOffice sin advertencias; comparación visual lado a lado con el formato original (mismo orden de secciones, mismos encabezados de tabla). Convertir a PDF (`soffice.py --headless --convert-to pdf`) como chequeo.

## WP7 — Gráficos
**Spike primero (1 h, tiempo acotado):** probar en un deploy Preview:
- Opción A: SVG generado a mano → PNG con `@resvg/resvg-js` (binario nativo, Linux OK en Vercel) o `sharp`.
- Opción B (fallback sin dependencia nativa): dibujar en el **navegador** con `<canvas>` en la vista previa y enviar los PNG en base64 al endpoint de generación (el usuario ya ve la vista previa). Más robusto en Vercel; recomendado si A falla o aumenta el tamaño de la función más del límite (250 MB descomprimido).
- Criterio: elegir A solo si el deploy pasa y `npm run build` no crece de forma relevante.
Gráficos (mismo diseño en ambas opciones; skill `dataviz` para paleta accesible, colores institucionales `#003366` / `#FFD700`, etiquetas legibles al imprimir en B/N):
1. Pastel: avance global (% de horas vs. meta o % actividades ejecutadas).
2. Curva: avance acumulado por mes (líder).
3. Barras: planificado vs. ejecutado (docentes/estudiantes) (líder).
4. Barras apiladas: género × rango de edad (ambos).
5. Barras: asistencia promedio por espacio (ambos).
6. Barras: MCER pre→post (líder).
7. Barras: satisfacción por dimensión (líder).
8. Barras horizontales: horas por pasante vs. 96 h (supervisor).
Módulo: `app/vinculacion/informes/_lib/graficos.ts`, una función por gráfico `(datos) => PNG`. Tamaño 1200×700 px, DPI 150.
- **Aceptación:** los 8 PNG se ven correctos con datos reales y con datos vacíos (mensaje "Sin datos en el período", nunca gráfico roto).

## WP8 — Pantalla y endpoints de informes (Supervisor)
Ruta `/vinculacion/informes` (protegida en `middleware.ts`; supervisor = `puedeSupervisarVinculacion`, líder = `puedeGestionarVinculacion`). Enlace en tarjeta "Supervisión de Vinculación".
- Endpoints (consolidar; `app/vinculacion/informes/api/route.ts` con acciones):
  - `GET ?accion=datos&tipo=supervisor&mes=YYYY-MM[&supervisor_id=]` → JSON de WP3 (líder/superadmin pueden pasar `supervisor_id`; un supervisor regular se fuerza a sí mismo con `resolverSupervisorFiltro`).
  - `POST accion=borrador-texto` → IA para observaciones (opcional).
  - `POST accion=generar` → recibe el JSON **ya editado** + gráficos (si opción B), construye el .docx, lo guarda (Cloudinary `raw` o Vercel Blob; decidir en WP0, no en Neon) y registra en `informes_vinculacion`.
  - `GET ?accion=historial`, `GET ?accion=descargar&id=`.
  - CRUD de obstáculos.
- UI: selector de mes (por defecto el mes anterior cerrado), tarjetas por sección con datos editables (tablas de tareas, observaciones, obstáculos), galería de fotos con checkbox "incluir", vista previa de gráficos, botón **Generar informe**, historial con descarga.
- Regla: un supervisor **no puede** generar informe de un mes futuro ni de otro supervisor; se puede regenerar (versiona con `creado_en`, conserva historial).
- **Aceptación:** supervisor de prueba (p. ej. Jorge) genera el informe de septiembre 2026 y descarga un .docx con solo sus espacios; el líder genera para cualquier supervisor; un profesor sin módulo `vinculacion` recibe 403.

## WP9 — Informe Líder semestral
- Misma pantalla, pestaña "Líder". Selector de ciclo (por defecto el vigente o el último cerrado). Bloques adicionales: presupuesto, MCER, satisfacción, objetivos vs. resultados, textos cualitativos editables, firma del Responsable de Vinculación y Emprendimiento (`firmante_responsable_id`).
- **Regla de firmas:** el .docx deja las líneas de firma en blanco; **no** firmar electrónicamente.
- **Aceptación:** informe 2026-1 con datos reales: totales coinciden con Dashboard PINE (`/api/admin/stats?periodo_id=`); cifras de beneficiarios y horas cuadran con `/vinculacion/supervisar/indicadores`.

## WP10 — Notificaciones
En `lib/notificaciones.ts` (`REGLAS_NOTIFICACION`) + fila en `NOTIFICACIONES.md`:
- `informe-supervisor-pendiente`: aplica a `puedeSupervisarVinculacion`; cuenta 1 si el mes anterior tiene sesiones aprobadas y no existe `informes_vinculacion` (supervisor, mes). `href` → `/vinculacion/informes`.
- `informe-lider-pendiente`: aplica a líder; 1 si el ciclo cerró hace ≤30 días sin informe.
- `fotos-sin-marcar` (opcional, informativa): sesiones aprobadas del mes sin `usar_en_informe` (no bloquea).
- La condición `aplica()` = misma que protege la pantalla.

## WP11 — Pruebas, documentación y despliegue
**Pruebas** (`scratch/`, gitignored, patrón `test-roles.mjs` con `scripts/_lib-sign-session.mjs`):
1. Roles: Arturo (superadmin), Cintya (líder), Jorge (supervisor), Jhonny (sin módulos), pasante → códigos esperados en cada ruta/API nueva.
2. Impersonación: con "Ver como" a un supervisor, el informe muestra solo sus espacios.
3. Datos: cuadres de WP3; informe vacío (mes sin sesiones) genera documento válido con secciones "Sin actividad".
4. Cloudinary caído (foto 404) → informe se genera con aviso.
5. Word/LibreOffice abren; PDF convertido correcto.
**Documentación:** CLAUDE.md (nueva "Sesión 51", tablas Neon nuevas, rutas nuevas, rol de cada módulo), `ANTIGRAVITY.md`, `MANUAL_USUARIO.md` (guía "Cómo generar el informe mensual"), `CHANGELOG.md`, `NOTIFICACIONES.md`, y actualizar `docs/PLAN_INFORMES_VINCULACION.md` con lo real.
**Despliegue por fase:**
1. Migración WP1 en Neon (con snapshot) **antes** de subir código que la use.
2. `npx tsc --noEmit` + `npm run build` locales limpios.
3. Preview de Vercel de la rama; probar flujo real (no solo build).
4. Merge a `main` (solo con orden del usuario) → auto-push por hook → confirmar `READY`.
5. Monitorear `get_runtime_logs` 24 h; rollback = revertir el commit (las tablas nuevas son aditivas y no rompen nada si quedan sin uso).

## 3. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Datos incompletos (género vacío, sin plan) hacen informes pobres | Mostrar "Sin dato"; semáforo de completitud en `/vinculacion/informes` ("faltan N beneficiarios sin género") |
| Librería de gráficos no cabe en Vercel | Spike WP7; fallback canvas en cliente |
| Cuota de funciones (~300) | Endpoints consolidados (1 route por módulo); no crear rutas por acción |
| Formato Word distinto al oficial | Comparación visual y aprobación del usuario antes de Fase 3 |
| Supervisor ve datos ajenos | `resolverSupervisorFiltro` forzado en servidor + prueba de roles |
| Colisión con trabajo paralelo de Antigravity/Claude | Rama propia, `git fetch` antes de empezar cada WP, no tocar `middleware.ts` fuera de las líneas de las rutas nuevas |
| Fotos pesadas / lentas | Transformación Cloudinary, máximo 12, timeout por foto |
| IA redacta texto erróneo | Siempre borrador editable; nunca se guarda sin acción del líder |

## 4. Checklist de "listo para producción" por fase
- [ ] Migración aplicada y verificada con SELECT; snapshot tomado.
- [ ] `tsc` y `build` limpios; sin claves duplicadas en estados de formularios.
- [ ] Pruebas de roles OK (403 donde corresponde).
- [ ] Informe real generado y revisado por el usuario.
- [ ] Notificaciones y documentación actualizadas.
- [ ] Vercel `READY`, logs sin errores.

## 5. Pendientes del usuario para desbloquear
1. Documento del proyecto (objetivos, cronograma, presupuesto, ODS, código, unidad académica, carrera exactos).
2. Confirmar quién es el **Responsable de Vinculación y Emprendimiento** (firmante).
3. Backfill de género de los 69 beneficiarios (o autorizar carga por Excel).
4. Dónde guardar los .docx generados (recomendado: Cloudinary `raw`, ya en uso).
