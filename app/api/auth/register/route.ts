import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      nombres, apellidos, email, password, rol,
      // Campos de estudiante
      carrera, modalidad, titulo_investigacion,
      // Campos de beneficiario
      contacto, situacion_laboral
    } = data;

    if (!nombres || !apellidos || !email || !password || !rol) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Verificar si el email ya existe
    const existingUser = await sql`SELECT id FROM usuarios WHERE email = ${email}`;
    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }

    // Hashear password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insertar usuario
    const userResult = await sql`
      INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol)
      VALUES (${nombres}, ${apellidos}, ${email}, ${password_hash}, ${rol})
      RETURNING id
    `;
    
    const userId = userResult[0].id;

    // Insertar perfil dependiendo del rol
    if (rol === 'estudiante') {
      await sql`
        INSERT INTO perfiles_estudiantes (usuario_id, carrera, modalidad, titulo_investigacion)
        VALUES (${userId}, ${carrera || null}, ${modalidad || null}, ${titulo_investigacion || null})
      `;
    } else if (rol === 'beneficiario') {
      await sql`
        INSERT INTO perfiles_beneficiarios (usuario_id, contacto, situacion_laboral)
        VALUES (${userId}, ${contacto || null}, ${situacion_laboral || null})
      `;
    }

    return NextResponse.json({ success: true, message: 'Usuario registrado exitosamente', userId });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error registrando el usuario', details: error.message },
      { status: 500 }
    );
  }
}
