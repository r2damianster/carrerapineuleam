'use client';

import { useState, useEffect } from 'react';

interface Enlace {
  token: string;
  nombre_invitado: string;
  expira_en: string;
  max_usos: number | null;
  usos_actuales: number;
  activo: boolean;
  creado_en: string;
}

export default function EnlacesDifusionList() {
  const [abierto, setAbierto] = useState(false);
  const [enlaces, setEnlaces] = useState<Enlace[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = () => {
    setLoading(true);
    fetch('/api/enlaces-difusion')
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => setEnlaces(data.data || []))
      .catch(() => setEnlaces([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (abierto) cargar();
  }, [abierto]);

  const revocar = async (token: string) => {
    if (!confirm('¿Revocar este enlace? Dejará de funcionar de inmediato.')) return;
    try {
      const res = await fetch(`/api/enlaces-difusion/${token}`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      cargar();
    } catch {
      alert('Error al revocar el enlace');
    }
  };

  const estado = (e: Enlace) => {
    if (!e.activo) return { label: 'Revocado', color: 'bg-gray-200 text-gray-600' };
    if (new Date(e.expira_en).getTime() <= Date.now()) return { label: 'Expirado', color: 'bg-gray-200 text-gray-600' };
    if (e.max_usos !== null && e.usos_actuales >= e.max_usos) return { label: 'Agotado', color: 'bg-gray-200 text-gray-600' };
    return { label: 'Activo', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="mt-2 text-right">
      <button type="button" onClick={() => setAbierto(!abierto)} className="text-xs font-medium text-gray-500 hover:underline">
        {abierto ? 'Ocultar enlaces generados' : 'Ver enlaces generados'}
      </button>
      {abierto && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 text-left">
          {loading && <p className="text-sm text-gray-400">Cargando...</p>}
          {!loading && enlaces.length === 0 && <p className="text-sm text-gray-400">No has generado ningún enlace todavía.</p>}
          <ul className="space-y-2">
            {enlaces.map(e => {
              const st = estado(e);
              return (
                <li key={e.token} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{e.nombre_invitado}</span>{' '}
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${st.color}`}>{st.label}</span>
                    <p className="text-xs text-gray-400">
                      Vence {new Date(e.expira_en).toLocaleDateString('es-EC')} · Usos: {e.usos_actuales}{e.max_usos !== null ? `/${e.max_usos}` : ''}
                    </p>
                  </div>
                  {st.label === 'Activo' && (
                    <button type="button" onClick={() => revocar(e.token)} className="text-xs font-semibold text-red-600 hover:underline whitespace-nowrap">
                      Revocar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
