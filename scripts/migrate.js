import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function runMigrations() {
  console.log("Iniciando migración...");

  try {
    // 1. Usuarios
    await sql`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) CHECK (rol IN ('admin', 'profesor', 'estudiante', 'beneficiario')),
        foto_url TEXT,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Tabla 'usuarios' creada.");

    // 2. Perfiles Estudiantes
    await sql`
      CREATE TABLE IF NOT EXISTS perfiles_estudiantes (
        usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
        carrera VARCHAR(100),
        modalidad VARCHAR(50),
        titulo_investigacion TEXT
      );
    `;
    console.log("Tabla 'perfiles_estudiantes' creada.");

    // 3. Perfiles Beneficiarios
    await sql`
      CREATE TABLE IF NOT EXISTS perfiles_beneficiarios (
        usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
        contacto VARCHAR(50),
        situacion_laboral VARCHAR(100)
      );
    `;
    console.log("Tabla 'perfiles_beneficiarios' creada.");

    // 4. Ciclos Académicos
    await sql`
      CREATE TABLE IF NOT EXISTS ciclos_academicos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        fecha_inicio DATE,
        fecha_fin DATE
      );
    `;
    console.log("Tabla 'ciclos_academicos' creada.");

    // 5. Espacios de Enseñanza
    await sql`
      CREATE TABLE IF NOT EXISTS espacios_enseñanza (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        tipo VARCHAR(50) CHECK (tipo IN ('aula', 'comunidad')),
        ciclo_id INTEGER REFERENCES ciclos_academicos(id),
        profesor_id INTEGER REFERENCES usuarios(id)
      );
    `;
    console.log("Tabla 'espacios_enseñanza' creada.");

    // 6. Inscripciones a Espacios
    await sql`
      CREATE TABLE IF NOT EXISTS inscripciones_espacio (
        espacio_id INTEGER REFERENCES espacios_enseñanza(id) ON DELETE CASCADE,
        beneficiario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        PRIMARY KEY (espacio_id, beneficiario_id)
      );
    `;
    console.log("Tabla 'inscripciones_espacio' creada.");

    // 7. Calificaciones
    await sql`
      CREATE TABLE IF NOT EXISTS calificaciones_ciclo (
        id SERIAL PRIMARY KEY,
        beneficiario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        ciclo_id INTEGER REFERENCES ciclos_academicos(id),
        nota_promedio DECIMAL(3, 1) CHECK (nota_promedio >= 0.0 AND nota_promedio <= 5.0)
      );
    `;
    console.log("Tabla 'calificaciones_ciclo' creada.");

    // 8. Evaluaciones MCER
    await sql`
      CREATE TABLE IF NOT EXISTS evaluaciones_mcer (
        id SERIAL PRIMARY KEY,
        beneficiario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo VARCHAR(20) CHECK (tipo IN ('inicial', 'final')),
        puntaje_obtenido INTEGER,
        nivel_asignado VARCHAR(10),
        respuestas_json JSONB,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Tabla 'evaluaciones_mcer' creada.");

    // 9. Encuestas Satisfacción
    await sql`
      CREATE TABLE IF NOT EXISTS encuestas_satisfaccion (
        id SERIAL PRIMARY KEY,
        beneficiario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        ciclo_id INTEGER REFERENCES ciclos_academicos(id),
        nivel_satisfaccion INTEGER CHECK (nivel_satisfaccion >= 1 AND nivel_satisfaccion <= 5),
        comentarios TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Tabla 'encuestas_satisfaccion' creada.");

    // 10. Actividades de Difusión
    await sql`
      CREATE TABLE IF NOT EXISTS actividades_difusion (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) CHECK (tipo IN ('podcast', 'evento_fisico', 'encuentro_comunitario', 'evento_formacion')),
        fecha DATE,
        ciclo_id INTEGER REFERENCES ciclos_academicos(id),
        registrador_id INTEGER REFERENCES usuarios(id),
        audiencia_alcanzada INTEGER,
        evidencia_url TEXT
      );
    `;
    console.log("Tabla 'actividades_difusion' creada.");

    // 11. Asistencias a Eventos
    await sql`
      CREATE TABLE IF NOT EXISTS asistencias_eventos (
        actividad_id INTEGER REFERENCES actividades_difusion(id) ON DELETE CASCADE,
        beneficiario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        PRIMARY KEY (actividad_id, beneficiario_id)
      );
    `;
    console.log("Tabla 'asistencias_eventos' creada.");

    console.log("Migración completada exitosamente!");
  } catch (error) {
    console.error("Error durante la migración:", error);
  }
}

runMigrations();
