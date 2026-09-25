import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { AppSession } from './session';
import { esSuperAdminOLider } from './permisos-supervision';
import { esDocente, puedeSupervisarVinculacion } from './modulos';
import { puedeAdministrarSitio } from './permisosProyecto';

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
  {
    // Administración del sitio: fotos con menores (o dudosas) esperando revisión humana. La foto NO se
    // publica hasta que alguien la marque como revisada. Destino /admin/photos (middleware: contenido_sitio).
    id: 'fotos-menores-por-revisar',
    aplica: (sesion) => sesion.modulos_acceso.includes('contenido_sitio'),
    consultar: async (sql) => {
      const [fila] = await sql`SELECT COUNT(*)::int AS total FROM fotos WHERE menores = 'revisar'`;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'fotos-menores-por-revisar',
        cantidad: total,
        mensaje: `Tienes ${plural(total, 'foto', 'fotos')} por revisar (posibles menores de edad).`,
        href: '/admin/photos?menores=revisar',
        severidad: 'pendiente',
      };
    },
  },
  {
    // Líder/colíder de proyecto (sin ser administración del sitio): fotos nuevas de su proyecto sin ubicar
    // en los últimos 14 días. Misma condición que el panel /portal/proyecto (docente + líder/colíder activo).
    id: 'fotos-sin-ubicar-proyecto',
    aplica: (sesion) => esDocente(sesion) && !puedeAdministrarSitio(sesion),
    consultar: async (sql, sesion) => {
      const usuarioId = Number(sesion.id);
      if (Number.isNaN(usuarioId)) return null;
      const proyectos = await sql`
        SELECT proyecto_id FROM proyecto_miembros
        WHERE usuario_id = ${usuarioId} AND activo = true AND rol_en_proyecto IN ('lider', 'colider')
      `;
      const proyectoIds = proyectos.map((fila) => String(fila.proyecto_id));
      if (proyectoIds.length === 0) return null;
      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM fotos
        WHERE proyectos && ${proyectoIds}::text[]
          AND visibilidad = 'publicable' AND menores = 'no' AND activo = true
          AND cardinality(ubicaciones) = 0
          AND created > now() - interval '14 days'
          AND (
            origen IN ('admin', 'lider', 'evidencia_evento')
            OR (origen IN ('evento', 'podcast') AND EXISTS (
              SELECT 1 FROM actividades_difusion a WHERE a.id::text = fotos.fuente_id AND a.aprobado_sitio = true))
            OR (origen = 'asistencia' AND EXISTS (
              SELECT 1 FROM asistencia_espacio s WHERE s.id::text = fotos.fuente_id AND s.estado_aprobacion = 'aprobado'))
          )
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'fotos-sin-ubicar-proyecto',
        cantidad: total,
        mensaje: `Tu proyecto tiene ${plural(total, 'foto nueva', 'fotos nuevas')} sin ubicar en la web.`,
        href: proyectoIds.length === 1 ? `/portal/proyecto/${proyectoIds[0]}/fotos?estado=sin_ubicar` : '/portal/proyecto',
        severidad: 'info',
      };
    },
  },
  {
    // Supervisor de Vinculación: informe mensual del mes anterior sin generar.
    id: 'informe-supervisor-pendiente',
    aplica: (sesion) => puedeSupervisarVinculacion(sesion),
    consultar: async (sql, sesion) => {
      const hoy = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().slice(0, 7);
      const supervisorId = Number(sesion.id);

      const [fila] = await sql`
        SELECT COUNT(*)::int AS total
        FROM asistencia_espacio ae
        JOIN "espacios_enseñanza" e ON e.id = ae.espacio_id
        WHERE e.area = 'vinculacion'
          AND ae.estado_aprobacion = 'aprobado'
          AND TO_CHAR(ae.fecha, 'YYYY-MM') = ${mesAnterior}
          AND (${esSuperAdminOLider(sesion)}::boolean IS TRUE OR e.profesor_id = ${supervisorId})
          AND NOT EXISTS (
            SELECT 1 FROM informes_vinculacion i
            WHERE i.tipo = 'supervisor'
              AND i.mes = (${mesAnterior} || '-01')::date
              AND i.supervisor_id = ${supervisorId}
          )
      `;
      const total = Number(fila?.total || 0);
      if (total === 0) return null;
      return {
        id: 'informe-supervisor-pendiente',
        cantidad: 1,
        mensaje: `Tienes pendiente generar el informe mensual de Vinculación correspondiente a ${mesAnterior}.`,
        href: '/vinculacion/informes',
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
