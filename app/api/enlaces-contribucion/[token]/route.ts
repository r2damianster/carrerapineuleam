import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import prisma from '@/lib/prisma';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGenerarEnlaceContribucion } from '@/lib/permisos-enlace-contribucion';
import { calcularPeriodoAcademico } from '@/lib/periodoAcademico';
import { contribucionSchema } from '@/lib/contribucionSchema';
import { datosContribucion, autoresParaCrear } from '@/lib/contribucionData';
import { esTokenValido, motivoEnlaceNoVigente, MAX_AUTORES } from '@/lib/enlaceContribucion';

export const dynamic = 'force-dynamic';

const MENSAJE_NO_VIGENTE = { revocado: 'revocado', expirado: 'vencido', agotado: 'ya usado' } as const;

// Público (sin sesión) — valida el token y devuelve lo necesario para armar el formulario:
// el tipo de contribución fijado por el docente, quién lo invita y, si el docente se puso como
// autor, su nombre y orden para precargar su fila.
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  try {
    if (!esTokenValido(params.token)) {
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const filas = await sql`
      SELECT el.nombre_invitado, el.tipo_publicacion, el.docente_es_autor, el.docente_orden,
             el.expira_en, el.max_usos, el.usos_actuales, el.activo,
             u.nombres, u.apellidos
      FROM enlaces_contribucion el
      JOIN usuarios u ON u.id = el.creado_por
      WHERE el.token = ${params.token}::uuid
    `;
    if (filas.length === 0) {
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }
    const enlace = filas[0];
    const motivo = motivoEnlaceNoVigente(enlace as any);
    if (motivo) {
      return NextResponse.json({ error: `Este enlace ya no está disponible (${MENSAJE_NO_VIGENTE[motivo]})` }, { status: 410 });
    }

    const nombreDocente = `${enlace.nombres} ${enlace.apellidos}`.trim();
    return NextResponse.json({
      success: true,
      data: {
        nombre_invitado: enlace.nombre_invitado,
        tipo_publicacion: enlace.tipo_publicacion,
        docente_nombre: nombreDocente,
        docente_autor: enlace.docente_es_autor
          ? { nombre: nombreDocente, orden: enlace.docente_orden }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Público (sin sesión) — registra la contribución. Siempre nace con origen='enlace_externo' y
// aprobada=false: no cuenta en estadísticas hasta que el docente que generó el enlace (o admin)
// la apruebe en /contribuciones. creadoPorId = ese docente, así puede editarla con los permisos
// de siempre. El tipo de publicación lo fija el enlace: se ignora el que mande el cliente.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  if (!esTokenValido(params.token)) {
    return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const nombreRegistrador = typeof body.registradorExternoNombre === 'string' ? body.registradorExternoNombre.trim() : '';
  const contactoRegistrador = typeof body.registradorExternoContacto === 'string' ? body.registradorExternoContacto.trim() : '';
  if (!nombreRegistrador) {
    return NextResponse.json({ error: 'Escribe tu nombre' }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
  const [enlace] = await sql`
    SELECT creado_por, tipo_publicacion, expira_en, max_usos, usos_actuales, activo
    FROM enlaces_contribucion WHERE token = ${params.token}::uuid
  `;
  if (!enlace) return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
  const motivo = motivoEnlaceNoVigente(enlace as any);
  if (motivo) {
    return NextResponse.json({ error: `Este enlace ya no está disponible (${MENSAJE_NO_VIGENTE[motivo]})` }, { status: 410 });
  }

  const resultado = contribucionSchema.safeParse({ ...body, tipoPublicacion: enlace.tipo_publicacion });
  if (!resultado.success) {
    return NextResponse.json({ error: resultado.error.errors }, { status: 400 });
  }
  const data = resultado.data;

  if (data.authors.length === 0 || data.authors.length > MAX_AUTORES) {
    return NextResponse.json({ error: `Debe haber entre 1 y ${MAX_AUTORES} autores` }, { status: 400 });
  }
  if (data.authors.some(autor => !autor.authorName.trim())) {
    return NextResponse.json({ error: 'Todos los autores deben tener nombre' }, { status: 400 });
  }
  if (new Set(data.authors.map(autor => autor.order)).size !== data.authors.length) {
    return NextResponse.json({ error: 'Dos autores no pueden tener el mismo número de orden' }, { status: 400 });
  }

  // Reserva el uso de forma atómica (evita que dos envíos simultáneos gasten un enlace de un solo uso).
  const reservado = await sql`
    UPDATE enlaces_contribucion SET usos_actuales = usos_actuales + 1
    WHERE token = ${params.token}::uuid AND activo AND expira_en > now()
      AND (max_usos IS NULL OR usos_actuales < max_usos)
    RETURNING token
  `;
  if (reservado.length === 0) {
    return NextResponse.json({ error: 'Este enlace ya no está disponible' }, { status: 410 });
  }

  try {
    const fechaPublicacion = new Date(data.fechaPublicacion);
    await prisma.contribution.create({
      data: {
        ...datosContribucion(data, fechaPublicacion, calcularPeriodoAcademico(fechaPublicacion)),
        creadoPorId: enlace.creado_por,
        origen: 'enlace_externo',
        aprobada: false,
        registradorExternoNombre: nombreRegistrador,
        registradorExternoContacto: contactoRegistrador || null,
        authors: { create: autoresParaCrear(data.authors) },
      },
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    // No se guardó: devuelve el uso reservado para no quemar el enlace por un error del servidor.
    await sql`UPDATE enlaces_contribucion SET usos_actuales = GREATEST(usos_actuales - 1, 0) WHERE token = ${params.token}::uuid`;
    console.error('Enlace contribución submit error:', error);
    return NextResponse.json({ error: 'Error registrando la contribución', details: error.message }, { status: 500 });
  }
}

// Protegido — revoca el enlace antes de tiempo. Solo quien lo creó, o admin/superadmin.
export async function PATCH(_request: Request, { params }: { params: { token: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGenerarEnlaceContribucion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!esTokenValido(params.token)) {
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const puedeRevocarCualquiera = usuario.modulos_acceso.includes('admin') || usuario.modulos_acceso.includes('superadmin');
    const [actualizado] = puedeRevocarCualquiera
      ? await sql`UPDATE enlaces_contribucion SET activo = false WHERE token = ${params.token}::uuid RETURNING token`
      : await sql`UPDATE enlaces_contribucion SET activo = false WHERE token = ${params.token}::uuid AND creado_por = ${Number(usuario.id)} RETURNING token`;
    if (!actualizado) {
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
