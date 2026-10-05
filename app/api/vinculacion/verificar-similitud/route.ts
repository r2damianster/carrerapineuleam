import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';
import { esDocente } from '@/lib/modulos';
import {
  buscarMasParecidoAsistencia,
  buscarMasParecidoDifusion,
  buscarMasParecidoBeneficiario,
  buscarConflictosConcurrenciaAsistencia,
} from '@/lib/similitudRegistros';

// Verificación previa (no bloqueante por sí sola) para el "Resumen de Validación" que se
// muestra antes de guardar asistencia/difusión/beneficiario. El bloqueo/aviso real de 70-90%
// lo aplica cada POST de guardado con `evaluarGateSimilitud` (misma lógica, no duplicada aquí).
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || ['secretaria', 'colaborador'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tipo, datos } = await request.json();
    const sql = neon(process.env.DATABASE_URL!);

    if (tipo === 'asistencia') {
      const { espacio_id, fecha, hora_inicio, hora_fin, beneficiarios_presentes, instructores_presentes, invitados_presentes } = datos ?? {};
      if (!espacio_id || !fecha || !hora_inicio || !hora_fin || !Array.isArray(beneficiarios_presentes)) {
        return NextResponse.json({ error: 'Datos incompletos para verificar asistencia' }, { status: 400 });
      }
      if (!(await puedeOperarEspacio(usuario, Number(espacio_id)))) {
        return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
      }
      const beneficiarios = beneficiarios_presentes.map(Number);
      const personalApoyo = [
        ...(Array.isArray(instructores_presentes) ? instructores_presentes : []),
        ...(Array.isArray(invitados_presentes) ? invitados_presentes : []),
      ].map(Number);

      const [similitud, conflictos] = await Promise.all([
        buscarMasParecidoAsistencia(sql, { espacioId: Number(espacio_id), fecha, horaInicio: hora_inicio, horaFin: hora_fin, beneficiarios, personalApoyo }),
        buscarConflictosConcurrenciaAsistencia(sql, { espacioId: Number(espacio_id), fecha, horaInicio: hora_inicio, horaFin: hora_fin, beneficiarios }),
      ]);
      return NextResponse.json({ success: true, similitud, conflictos_concurrencia: conflictos });
    }

    if (tipo === 'difusion') {
      const { titulo, tipo_actividad, categoria, fecha, hora, proyectos, profesores_responsables } = datos ?? {};
      if (!titulo || !tipo_actividad || !fecha) {
        return NextResponse.json({ error: 'Datos incompletos para verificar difusión' }, { status: 400 });
      }
      if (usuario.rol !== 'estudiante' && !esDocente(usuario)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      const similitud = await buscarMasParecidoDifusion(sql, {
        titulo,
        tipo: tipo_actividad,
        categoria: categoria ?? '',
        hora: hora || null,
        proyectos: Array.isArray(proyectos) ? proyectos : [],
        profesoresResponsables: Array.isArray(profesores_responsables) ? profesores_responsables.map(Number) : [],
      }, fecha);
      return NextResponse.json({ success: true, similitud });
    }

    if (tipo === 'beneficiario') {
      const { espacio_id, nombres, apellidos, edad, email } = datos ?? {};
      if (!espacio_id || !nombres || !apellidos) {
        return NextResponse.json({ error: 'Datos incompletos para verificar beneficiario' }, { status: 400 });
      }
      if (!(await puedeOperarEspacio(usuario, Number(espacio_id)))) {
        return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
      }
      const similitud = await buscarMasParecidoBeneficiario(sql, {
        nombreCompleto: `${nombres} ${apellidos}`,
        edad: edad || edad === 0 ? Number(edad) : null,
        email: email || null,
        espacioId: Number(espacio_id),
      });
      return NextResponse.json({ success: true, similitud });
    }

    return NextResponse.json({ error: 'Tipo no soportado' }, { status: 400 });
  } catch (error: any) {
    console.error('Verificar-similitud error:', error);
    return NextResponse.json({ error: 'Error verificando similitud', details: error.message }, { status: 500 });
  }
}
