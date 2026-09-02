'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SuperadminSqlPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [query, setQuery] = useState('SELECT * FROM usuarios LIMIT 20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Record<string, any>[] | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!data.usuario.modulos_acceso?.includes('superadmin')) {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => router.push('/portal/login?redirect=/superadmin/sql'));
  }, [router]);

  const ejecutar = async (confirmed: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/superadmin/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, confirmed }),
      });
      const data = await res.json();
      if (res.status === 409 && data.requiresConfirmation) {
        if (confirm(`${data.error}\n\n¿Ejecutar de todas formas?`)) {
          return ejecutar(true);
        }
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setRows(data.rows);
    } catch (err: any) {
      setError(err.message);
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) return <div className="p-8">Cargando…</div>;

  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link href="/superadmin" className="text-sm text-gray-500 hover:underline">
              ← Superadmin
            </Link>
            <h1 className="text-xl font-bold text-uleam-blue">Consola SQL</h1>
            <p className="text-xs text-gray-500">
              Una sentencia por ejecución. DROP/TRUNCATE/ALTER y DELETE/UPDATE sin WHERE piden confirmación. Todo queda en el log de auditoría.
            </p>
          </div>
          <Link href="/superadmin/audit" className="text-sm text-uleam-blue hover:underline">
            Ver log de auditoría →
          </Link>
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={8}
          className="w-full border rounded p-3 font-mono text-sm mb-3"
          spellCheck={false}
        />

        <button
          onClick={() => ejecutar(false)}
          disabled={loading || !query.trim()}
          className="bg-uleam-blue text-white px-5 py-2 rounded hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Ejecutando…' : 'Ejecutar'}
        </button>

        {error && <p className="text-red-600 mt-4 text-sm whitespace-pre-wrap">{error}</p>}

        {rows && (
          <div className="bg-white rounded shadow overflow-x-auto mt-4">
            {rows.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">Consulta ejecutada — 0 filas devueltas.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left font-mono text-xs text-gray-600 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      {columns.map((col) => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap max-w-xs truncate text-xs">
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="p-2 text-xs text-gray-400 border-t">{rows.length} fila(s)</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCell(value: any): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
