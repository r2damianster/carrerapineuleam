'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SuperadminPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [tables, setTables] = useState<string[]>([]);
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
        return fetch('/api/superadmin/tables')
          .then((res) => res.json())
          .then((d) => {
            if (d.error) throw new Error(d.error);
            setTables(d.tables);
          });
      })
      .catch((err) => {
        if (err?.message) setError(err.message);
        else router.push('/portal/login?redirect=/superadmin');
      });
  }, [router]);

  if (checkingSession) return <div className="p-8">Cargando…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-uleam-blue">Superadmin — Acceso absoluto a la Neon</h1>
            <p className="text-sm text-gray-600">Explorador de tablas + consola SQL. Toda acción queda auditada.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/superadmin/sql" className="bg-uleam-blue text-white px-4 py-2 rounded hover:opacity-90">
              Consola SQL
            </Link>
            <Link href="/superadmin/audit" className="border border-uleam-blue text-uleam-blue px-4 py-2 rounded hover:bg-gray-100">
              Log de auditoría
            </Link>
            <Link href="/portal/dashboard" className="text-gray-500 px-4 py-2 hover:underline">
              Volver al Portal
            </Link>
          </div>
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="bg-white rounded shadow divide-y">
          {tables.map((table) => (
            <Link
              key={table}
              href={`/superadmin/${table}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-mono text-sm text-gray-800">{table}</span>
              <span className="text-gray-400 text-sm">Ver / Editar →</span>
            </Link>
          ))}
          {tables.length === 0 && !error && <p className="p-4 text-gray-500">Sin tablas.</p>}
        </div>
      </div>
    </div>
  );
}
