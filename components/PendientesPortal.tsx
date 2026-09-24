import Link from 'next/link';
import type { Notificacion } from '@/lib/notificaciones';

const ESTILO_POR_SEVERIDAD: Record<Notificacion['severidad'], string> = {
  info: 'border-blue-300 bg-blue-50 text-blue-900',
  pendiente: 'border-amber-300 bg-amber-50 text-amber-900',
  alerta: 'border-red-300 bg-red-50 text-red-900',
};

// Bloque "Pendientes" del /portal/dashboard. Server Component: recibe las
// notificaciones ya resueltas (lib/notificaciones.ts). No se muestra si no hay ninguna.
export default function PendientesPortal({ notificaciones }: { notificaciones: Notificacion[] }) {
  if (notificaciones.length === 0) return null;

  return (
    <section aria-label="Pendientes" className="mb-8">
      <h2 className="text-lg font-bold text-gray-800 mb-3">
        🔔 Pendientes ({notificaciones.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {notificaciones.map((notificacion) => (
          <li key={notificacion.id}>
            <Link
              href={notificacion.href}
              className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 hover:shadow transition ${ESTILO_POR_SEVERIDAD[notificacion.severidad]}`}
            >
              <span className="text-sm font-medium">{notificacion.mensaje}</span>
              <span className="text-sm font-semibold whitespace-nowrap">Revisar »</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
