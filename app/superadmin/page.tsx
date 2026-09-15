'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TableInfo {
  table_name: string;
  description: string | null;
}

export default function SuperadminPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [error, setError] = useState('');
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

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

  const empezarEdicion = (t: TableInfo) => {
    setEditingTable(t.table_name);
    setEditValue(t.description ?? '');
  };

  const guardarDescripcion = async (tableName: string) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/superadmin/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: tableName, description: editValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTables((prev) =>
        prev.map((t) => (t.table_name === tableName ? { ...t, description: editValue.trim() || null } : t))
      );
      setEditingTable(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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

        <p className="text-xs text-gray-500 mb-2">
          Clic en el lápiz para anotar qué es y para qué sirve cada tabla — queda guardado como
          comentario nativo de Postgres (<code>COMMENT ON TABLE</code>), visible también desde psql/Neon Console.
        </p>

        <div className="bg-white rounded shadow divide-y">
          {tables.map((t) => (
            <div key={t.table_name} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <Link href={`/superadmin/${t.table_name}`} className="font-mono text-sm text-gray-800 hover:underline">
                  {t.table_name}
                </Link>
                <div className="flex items-center gap-3">
                  {editingTable !== t.table_name && (
                    <button
                      onClick={() => empezarEdicion(t)}
                      className="text-gray-400 hover:text-uleam-blue text-xs"
                      title="Editar descripción"
                    >
                      ✏️ {t.description ? 'Editar' : 'Agregar descripción'}
                    </button>
                  )}
                  <Link href={`/superadmin/${t.table_name}`} className="text-gray-400 text-sm">
                    Ver / Editar →
                  </Link>
                </div>
              </div>

              {editingTable === t.table_name ? (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    className="border rounded px-2 py-1 flex-1 text-sm"
                    placeholder="¿Qué guarda esta tabla y para qué se usa?"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') guardarDescripcion(t.table_name);
                      if (e.key === 'Escape') setEditingTable(null);
                    }}
                  />
                  <button
                    onClick={() => guardarDescripcion(t.table_name)}
                    disabled={saving}
                    className="bg-uleam-blue text-white px-3 py-1 rounded text-sm"
                  >
                    Guardar
                  </button>
                  <button onClick={() => setEditingTable(null)} className="text-gray-500 text-sm px-2">
                    Cancelar
                  </button>
                </div>
              ) : (
                t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>
              )}
            </div>
          ))}
          {tables.length === 0 && !error && <p className="p-4 text-gray-500">Sin tablas.</p>}
        </div>
      </div>
    </div>
  );
}
