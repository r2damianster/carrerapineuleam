# Plan: informes automáticos de Vinculación (Líder semestral / Supervisor mensual)

Fuentes: `Informe de Avances y Logros Proyecto (Presidente-Lider).docx` e `Informe de Seguimiento de Tareas (Supervisor).docx` (raíz del repo; mover a `app/utilidades/_templates/` con nombre normalizado al implementar).

## Decisiones confirmadas (2026-09-25)
1. Objetivos, actividades planificadas, metas y presupuesto viven en tablas de Neon, reutilizables entre ciclos.
2. Beneficiarios indirectos = **proyectados** (meta en la ficha, no se cuentan uno a uno).
3. Zona fija: **Distrito 13D02 Manta**. Se agrega automáticamente el N.º de espacios en ejecución y sus nombres (desde `espacios_enseñanza` del ciclo).
4. Presupuesto en BD del proyecto.
5. Dependencia de gráficos aceptada (`chartjs-node-canvas` o `sharp`; validar tamaño en Vercel).
6. Informe del **supervisor: mensual**. Informe del **líder: semestral** (= `ciclos_academicos`).

## Esquema nuevo (migración a mano, estilo `scripts/migrate-*.js`; nunca prisma)

```sql
CREATE TABLE proyecto_ficha (            -- 1 fila por proyecto (y vigencia)
  proyecto_id TEXT PRIMARY KEY REFERENCES proyectos(id),
  codigo TEXT, unidad_academica TEXT, carrera TEXT,
  entidad_beneficiaria TEXT, vigencia_inicio DATE, vigencia_fin DATE,
  ods TEXT, linea_investigacion TEXT,
  zona TEXT DEFAULT 'Distrito 13D02 Manta',
  meta_beneficiarios_directos INT, meta_beneficiarios_indirectos INT,
  meta_estudiantes INT, meta_docentes INT,
  codigo_documento_lider TEXT, revision_documento_lider TEXT,
  codigo_documento_supervisor TEXT, revision_documento_supervisor TEXT
);
CREATE TABLE proyecto_objetivos (
  id SERIAL PRIMARY KEY, proyecto_id TEXT NOT NULL REFERENCES proyectos(id),
  tipo TEXT CHECK (tipo IN ('general','especifico')) DEFAULT 'especifico',
  texto TEXT NOT NULL, orden INT DEFAULT 0, activo BOOLEAN DEFAULT true
);
CREATE TABLE proyecto_actividades_plan (
  id SERIAL PRIMARY KEY, objetivo_id INT NOT NULL REFERENCES proyecto_objetivos(id),
  actividad TEXT NOT NULL, metodologia TEXT,
  ciclo_id INT REFERENCES ciclos_academicos(id),
  mes_inicio DATE, mes_fin DATE,
  espacio_id INT REFERENCES "espacios_enseñanza"(id),   -- opcional
  responsable_id INT REFERENCES usuarios(id), activo BOOLEAN DEFAULT true
);
CREATE TABLE proyecto_presupuesto (
  id SERIAL PRIMARY KEY, proyecto_id TEXT NOT NULL REFERENCES proyectos(id),
  ciclo_id INT REFERENCES ciclos_academicos(id),
  cedula_presupuestaria TEXT, concepto TEXT NOT NULL,
  solicitado NUMERIC(12,2) DEFAULT 0, ejecutado NUMERIC(12,2) DEFAULT 0,
  responsable_id INT REFERENCES usuarios(id)
);
CREATE TABLE proyecto_textos_ciclo (     -- cualitativos por ciclo (editables, con borrador IA)
  proyecto_id TEXT, ciclo_id INT, clave TEXT, texto TEXT,
  PRIMARY KEY (proyecto_id, ciclo_id, clave)
  -- claves: problema_inicial, aporte_academico, aporte_ods, nuevos_problemas,
  --         nuevos_proyectos, mejora_oferta, aporte_titulacion
);
CREATE TABLE supervision_obstaculos (
  id SERIAL PRIMARY KEY, supervisor_id INT NOT NULL REFERENCES usuarios(id),
  mes DATE NOT NULL, restriccion TEXT NOT NULL, accion_correctiva TEXT
);
CREATE TABLE informes_vinculacion (      -- historial
  id SERIAL PRIMARY KEY, tipo TEXT CHECK (tipo IN ('lider','supervisor')),
  supervisor_id INT, ciclo_id INT, mes DATE, datos_json JSONB,
  archivo_url TEXT, generado_por INT REFERENCES usuarios(id), creado_en TIMESTAMP DEFAULT now()
);
ALTER TABLE asistencia_espacio
  ADD COLUMN actividad_plan_id INT REFERENCES proyecto_actividades_plan(id),
  ADD COLUMN no_prevista BOOLEAN DEFAULT false,
  ADD COLUMN usar_en_informe BOOLEAN DEFAULT false,
  ADD COLUMN comentario_supervisor TEXT;
```
Género: `usuarios.genero` ya existe (vacío en 69/69) → agregar al formulario de registro/Pre-Test/QR público y backfill.

## Mapeo informe → datos

| Sección | Líder (semestre) | Supervisor (mes) |
|---|---|---|
| Info general | `proyectos` + `proyecto_ficha` + `ciclos_academicos`; beneficiarios directos = `inscripciones_espacio` del ciclo, indirectos = meta ficha | igual; supervisor = usuario; estudiantes supervisados = `espacio_instructores` de sus espacios; período = mes |
| Zona | ficha.zona + N.º y nombres de espacios activos del ciclo | ídem, solo sus espacios |
| Cronograma | `proyecto_actividades_plan` en tabla sombreada; realizadas = con sesiones aprobadas | solo sus actividades/espacios |
| Actividades/tareas | plan + sesiones aprobadas (`asistencia_espacio`), % avance, N.º pasantes (`asistencia_instructores`) | idem por tarea; no previstas = `no_prevista` |
| Participación | docentes/estudiantes plan vs. ejecutado (metas ficha vs. pasantes con horas) | pasantes por espacio con horas y % de meta |
| Beneficiarios | por género y rango de edad (`perfiles_beneficiarios`, `usuarios.genero`), discapacidad, ocupación | por sexo, solo sus espacios |
| Resultados | ganancia MCER pre→post, satisfacción (4 dimensiones + instructor) | — |
| Textos cualitativos | `proyecto_textos_ciclo` (borrador IA editable) | — |
| Presupuesto | `proyecto_presupuesto` con % ejecución | — |
| Obstáculos | — | `supervision_obstaculos` |
| Adjuntos | fotos `usar_en_informe`, máx. 12, con pie | idem, solo relevantes |

## Gráficos (PNG generados en servidor → `ImageRun` de `docx`)
Pastel avance global · curva acumulada por mes · barras plan vs. ejecutado · barras apiladas género×edad · asistencia por espacio · MCER pre→post · satisfacción · progreso de pasantes vs. 96 h. Cronograma = tabla con celdas sombreadas (sin imagen).

## Fases
1. **Datos base**: migración de tablas, pantalla `/vinculacion/proyecto` (líder: ficha, objetivos, actividades, presupuesto, textos), campo género en registros.
2. **Informe Supervisor mensual**: `lib/informesVinculacion.ts` (`datosInformeSupervisor`), plantilla .docx, fotos, gráficos, vista previa editable, historial.
3. **Informe Líder semestral**: `datosInformeLider`, gráficos de avance, IA para cualitativos.
4. Reglas de notificación (`lib/notificaciones.ts` + `NOTIFICACIONES.md`): "informe mensual por generar", "informe pendiente de firma".

Permisos: líder = `vinculacion_gestion`; supervisor = `vinculacion` (alcance por `lib/alcanceSupervision.ts`).
Rutas: `/vinculacion/informes` (pestañas Supervisor / Líder), `/vinculacion/proyecto` (ficha y catálogo).

## Pendiente del usuario
- Documento del proyecto de vinculación (objetivos, cronograma, presupuesto, ODS, código) para sembrar tablas; si no, se cargan a mano desde `/vinculacion/proyecto`.
- Backfill de género de los 69 beneficiarios.
