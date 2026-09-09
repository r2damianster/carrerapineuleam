import { NextResponse } from 'next/server';
import { getAppSessionFromCookies } from '@/lib/session';
import { pedirCompletionIA } from '@/app/utilidades/_lib/groq';

const CATEGORIA_LABEL: Record<string, string> = {
  investigacion: 'Investigación',
  vinculacion: 'Vinculación',
  asignatura: 'Asignatura',
};

const TIPO_LABEL: Record<string, string> = {
  podcast: 'Podcast',
  evento_fisico: 'Evento físico',
  encuentro_comunitario: 'Encuentro comunitario',
  evento_formacion: 'Evento de formación',
  visita_tecnica: 'Visita técnica',
};

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const {
      titulo, tipo, categoria, proyecto, asignatura, fecha, hora, audiencia_alcanzada,
      descripcion_actual, observaciones_actual,
    } = await request.json();
    if (!titulo) {
      return NextResponse.json({ error: 'Falta el título del evento' }, { status: 400 });
    }

    const datosConocidos = [
      `Título: ${titulo}`,
      `Tipo de evento: ${TIPO_LABEL[tipo] || tipo || 'no especificado'}`,
      `Categoría: ${CATEGORIA_LABEL[categoria] || categoria || 'no especificada'}`,
      proyecto ? `Proyecto de investigación asociado: ${proyecto}` : '',
      asignatura ? `Asignatura asociada: ${asignatura}` : '',
      fecha ? `Fecha: ${fecha}` : '',
      hora ? `Hora: ${hora}` : '',
      audiencia_alcanzada ? `Número de asistentes/audiencia: ${audiencia_alcanzada}` : '',
    ].filter(Boolean).join('\n');

    const tieneBorrador = !!(descripcion_actual?.trim() || observaciones_actual?.trim());
    const bloqueBorrador = tieneBorrador
      ? `\n\nBorrador escrito por el docente (mejóralo: corrige redacción, dale formato institucional, no inventes datos nuevos que no estén ahí ni en los datos del evento):\nDescripción actual: ${descripcion_actual || '(vacía)'}\nObservaciones actuales: ${observaciones_actual || '(vacías)'}`
      : '';

    const instruccion = tieneBorrador
      ? 'Mejora el borrador del docente (no lo reescribas desde cero ni cambies su sentido, solo pule redacción/formato) y complétalo si falta algo obvio a partir de los datos del evento.'
      : 'Redacta la descripción y observaciones desde cero, a partir únicamente de los datos del evento.';

    const contenido = await pedirCompletionIA(
      [
        {
          role: 'system',
          content:
            'Redactas en español, en tono formal-institucional, la ficha de un evento académico de la Carrera de Pedagogía de Idiomas de ULEAM, ' +
            'a partir únicamente de los datos ya registrados por el docente (no inventes datos concretos que no te dieron, como nombres de personas o lugares). ' +
            `${instruccion} ` +
            'Responde SOLO un JSON con dos claves: "descripcion" (2-4 líneas describiendo qué fue el evento y su relevancia, redactada como si ya hubiera ocurrido) ' +
            'y "observaciones" (una nota breve opcional, ej. logros, dificultades o seguimiento; usa cadena vacía "" si no hay nada relevante que anotar).',
        },
        {
          role: 'user',
          content: `Datos del evento:\n${datosConocidos}${bloqueBorrador}\n\nGenera la descripción y observaciones.`,
        },
      ],
      { temperature: 0.4, responseFormatJson: true }
    );

    const parsed = JSON.parse(contenido);
    return NextResponse.json({
      descripcion: typeof parsed.descripcion === 'string' ? parsed.descripcion.trim() : '',
      observaciones: typeof parsed.observaciones === 'string' ? parsed.observaciones.trim() : '',
    });
  } catch (error: any) {
    console.error('Generar texto IA (difusión) error:', error);
    return NextResponse.json({ error: error.message || 'Error generando texto con IA' }, { status: 500 });
  }
}
