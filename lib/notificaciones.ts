import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { AppSession } from './session';
import { esSuperAdminOLider } from './permisos-supervision';
import { puedeSupervisarVinculacion } from './modulos';

/**
 * Módulo de notificaciones del Portal PINE.
 *
 * Las notificaciones son DERIVADAS: cada regla cuenta pendientes reales en Neon
 * (no hay tabla de avisos, así nunca se desincronizan). Para agregar un aviso nuevo
 * basta con sumar una regla a REGLAS_NOTIFICACION al final de este archivo.
 *
 * ⚠️ REGLA DEL PROYECTO: toda función nueva del portal que deje algo "pendiente"
 * para alguien (aprobar, revisar, completar, responder) DEBE agregar su regla aquí
 * y documentarse en NOTIFICACIONES.md. Ver la checklist de ese archivo.
 */

export type SeveridadNotificacion = 'info' | 'pendiente' | 'alerta';

export interface Notificacion {
  id: string;
  cantidad: number;
  mensaje: string;
  href: string;
  severidad: SeveridadNotificacion;
}

type ClienteSql = NeonQueryFunction<false, false>;

interface ReglaNotificacion {
  /** Identificador estable (kebab-case). Se usa como key en la UI. */
  id: string;
  /** Quién ve este aviso. Usar la misma condición que protege la pantalla destino. */
  aplica: (sesion: AppSession) => boolean;
  /** Devuelve la notificación, o null si no hay nada pendiente. */
  consultar: (sql: ClienteSql, sesion: AppSession) => Promise<Notificacion | null>;
}

const plural = (cantidad: number, singular: string, pluralTexto: string) =>
  `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;

const REGLAS_NOTIFICACION: ReglaNotificacion[] = [
  {
    // Supervisor de Vinculación: asistencias que registraron los pasantes y esperan aprobación.
    // Misma visibilidad que GET /api/vinculacion/supervisar-asistencia.
    id: 'asistencias-por-aprobar',
    aplica: (sesion) => puedeSupervisarVinculacion(sesion),
    consultar: async (sql, sesion) => {
      const veTodo = esSuperAdminOLider(sesion);
      const profesorId = Number(sesion.id);
      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM asistencia_espacio ae
        JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
        WHERE e.area = 'vinculacion'
          AND ae.estado_aprobacion = 'pendiente'
          AND (${veTodo}::boolean IS TRUE OR e.profesor_id = ${profesorId})
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'asistencias-por-aprobar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'registro de asistencia', 'registros de asistencia')} por aprobar.`,
        href: '/vinculacion/supervisar',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Supervisor de Vinculación: horas de podcast e investigación de sus pasantes por aprobar.
    // Misma visibilidad que GET /api/vinculacion/supervisar-horas.
    id: 'horas-por-aprobar',
    aplica: (sesion) => puedeSupervisarVinculacion(sesion),
    consultar: async (sql, sesion) => {
      const veTodo = esSuperAdminOLider(sesion);
      const profesorId = Number(sesion.id);
      const [fila] = await sql`
        SELECT
          (SELECT COUNT(*) FROM horas_podcast_pasante h WHERE h.estado_aprobacion = 'pendiente'
             AND (${veTodo}::boolean IS TRUE OR EXISTS (
               SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
               WHERE ei.usuario_id = h.usuario_id AND e.area = 'vinculacion' AND e.profesor_id = ${profesorId}))) AS podcast,
          (SELECT COUNT(*) FROM actividades_investigacion_pasante a WHERE a.estado_aprobacion = 'pendiente'
             AND (${veTodo}::boolean IS TRUE OR EXISTS (
               SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
               WHERE ei.usuario_id = a.usuario_id AND e.area = 'vinculacion' AND e.profesor_id = ${profesorId}))) AS investigacion,
          (SELECT COUNT(*) FROM actividades_autonomas_pasante a WHERE a.estado_aprobacion = 'pendiente'
             AND (${veTodo}::boolean IS TRUE OR EXISTS (
               SELECT 1 FROM espacio_instructores ei JOIN "espacios_enseñanza" e ON e.id = ei.espacio_id
               WHERE ei.usuario_id = a.usuario_id AND e.area = 'vinculacion' AND e.profesor_id = ${profesorId}))) AS autonomas
      `;
      const conteos = { podcast: Number(fila?.podcast || 0), investigacion: Number(fila?.investigacion || 0), autonomas: Number(fila?.autonomas || 0) };
      const total = conteos.podcast + conteos.investigacion + conteos.autonomas;
      if (total === 0) return null;
      return {
        id: 'horas-por-aprobar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'registro', 'registros')} por aprobar (${[
          conteos.podcast && `${conteos.podcast} de podcast`,
          conteos.investigacion && `${conteos.investigacion} de investigación`,
          conteos.autonomas && `${conteos.autonomas} de actividades autónomas`,
        ].filter(Boolean).join(', ')}).`,
        href: '/vinculacion/supervisar',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Pasante: asistencias que registró y el supervisor rechazó. Sin tabla de "leído":
    // el aviso vive 14 días desde el rechazo (ventana de tiempo) y luego se apaga solo.
    id: 'asistencias-rechazadas',
    aplica: (sesion) => sesion.rol === 'estudiante',
    consultar: async (sql, sesion) => {
      const pasanteId = Number(sesion.id);
      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM asistencia_espacio
        WHERE registrado_por = ${pasanteId}
          AND estado_aprobacion = 'rechazado'
          AND COALESCE(fecha_aprobacion, creado_en) >= NOW() - INTERVAL '14 days'
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'asistencias-rechazadas',
        cantidad: total,
        mensaje: `${plural(total, 'registro de asistencia tuyo fue rechazado', 'registros de asistencia tuyos fueron rechazados')} por el supervisor. Revisa el motivo y vuelve a registrarlo.`,
        href: '/portal/mi-avance',
        severidad: 'alerta',
      };
    },
  },
  {
    // Administrador de contenido: podcasts/videos propuestos que aún no salen en la web pública.
    id: 'videos-por-aprobar',
    aplica: (sesion) => sesion.modulos_acceso.includes('contenido_sitio'),
    consultar: async (sql) => {
      const [fila] = await sql`SELECT COUNT(*)::int AS total FROM videos WHERE aprobado_sitio = false`;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'videos-por-aprobar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'video/podcast', 'videos/podcasts')} por aprobar.`,
        href: '/admin/videos',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Administrador de contenido: eventos/noticias registrados por docentes, pasantes o externos.
    id: 'difusion-por-aprobar',
    aplica: (sesion) => sesion.modulos_acceso.includes('contenido_sitio'),
    consultar: async (sql) => {
      const [fila] = await sql`SELECT COUNT(*)::int AS total FROM actividades_difusion WHERE aprobado_sitio = false`;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'difusion-por-aprobar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'evento/actividad', 'eventos/actividades')} de difusión por aprobar.`,
        href: '/admin/contenido',
        severidad: 'pendiente',
      };
    },
  },
];

/**
 * Devuelve las notificaciones de la sesión activa. Bajo "Ver como" la sesión es la
 * del usuario suplantado, así se ve exactamente lo que esa persona vería.
 * Una regla que falla no tumba a las demás.
 */
export async function obtenerNotificaciones(sesion: AppSession): Promise<Notificacion[]> {
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
  const reglasAplicables = REGLAS_NOTIFICACION.filter((regla) => regla.aplica(sesion));

  const resultados = await Promise.all(
    reglasAplicables.map(async (regla) => {
      try {
        return await regla.consultar(sql, sesion);
      } catch (error) {
        console.error(`[notificaciones] regla "${regla.id}" falló:`, error);
        return null;
      }
    })
  );

  return resultados.filter((notificacion): notificacion is Notificacion => notificacion !== null);
}
