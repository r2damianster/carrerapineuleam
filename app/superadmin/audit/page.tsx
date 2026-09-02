'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuditRow {
  id: number;
  actor_email: string;
  creado_en: string;
  tipo_accion: string;
  tabla_afectada: string | null;
  detalle: string;
  resultado: string | null;
}

export default function SuperadminAuditPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!data.usuario.modulos_acceso?.includes('superadmin')) {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
        return fetch('/api/superadmin/audit?limit=200')
          .then((r) => r.json())
          .then((d) => {
            if (d.error) throw new Error(d.error);
            setRows(d.rows);
          });
      })
      .catch((err) => {
        if (err?.message) setError(err.message);
        else router.push('/portal/login?redirect=/superadmin/audit');
      });
  }, [router]);

  if (checkingSession) return <div className="p-8">Cargando…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/superadmin" className="text-sm text-gray-500 hover:underline">
          ← Superadmin
        </Link>
        <h1 className="text-xl font-bold text-uleam-blue mb-4">Log de auditoría</h1>

        {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray-600">Fecha</th>
                <th className="px-3 py-2 text-left text-xs text-gray-600">Actor</th>
                <th className="px-3 py-2 text-left text-xs text-gray-600">Acción</th>
                <th className="px-3 py-2 text-left text-xs text-gray-600">Tabla</th>
                <th className="px-3 py-2 text-left text-xs text-gray-600">Detalle</th>
                <th className="px-3 py-2 text-left text-xs text-gray-600">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {new Date(r.creado_en).toLocaleString('es-EC')}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{r.actor_email}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-mono">{r.tipo_accion}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-mono">{r.tabla_afectada ?? '—'}</td>
                  <td className="px-3 py-2 max-w-md text-xs font-mono whitespace-pre-wrap break-all">{r.detalle}</td>
                  <td className="px-3 py-2 text-xs whitespace-pre-wrap max-w-xs">
                    <span className={r.resultado?.startsWith('ERROR') ? 'text-red-600' : 'text-green-700'}>
                      {r.resultado}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    Sin acciones registradas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
