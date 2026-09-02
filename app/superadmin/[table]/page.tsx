'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
}

export default function SuperadminTablePage() {
  const router = useRouter();
  const params = useParams<{ table: string }>();
  const table = params.table;

  const [checkingSession, setCheckingSession] = useState(true);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [primaryKey, setPrimaryKey] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [editingPk, setEditingPk] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState<Record<string, any>>({});

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [schemaRes, rowsRes] = await Promise.all([
        fetch(`/api/superadmin/tables/${table}/schema`).then((r) => r.json()),
        fetch(`/api/superadmin/tables/${table}/rows?page=${page}&limit=${limit}`).then((r) => r.json()),
      ]);
      if (schemaRes.error) throw new Error(schemaRes.error);
      if (rowsRes.error) throw new Error(rowsRes.error);
      setColumns(schemaRes.columns);
      setPrimaryKey(schemaRes.primaryKey);
      setRows(rowsRes.rows);
      setTotal(rowsRes.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [table, page]);

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
      .catch(() => router.push('/portal/login?redirect=/superadmin'));
  }, [router]);

  useEffect(() => {
    if (!checkingSession) cargar();
  }, [checkingSession, cargar]);

  const empezarEdicion = (row: Record<string, any>) => {
    if (!primaryKey) return;
    setEditingPk(row[primaryKey]);
    setEditForm({ ...row });
  };

  const guardarEdicion = async () => {
    if (!primaryKey) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/superadmin/tables/${table}/rows`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pkValue: editingPk, data: editForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Fila actualizada.');
      setEditingPk(null);
      await cargar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const borrarFila = async (row: Record<string, any>) => {
    if (!primaryKey) return;
    if (!confirm(`¿Borrar fila con ${primaryKey} = ${row[primaryKey]} de "${table}"? No se puede deshacer.`)) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/superadmin/tables/${table}/rows`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pkValue: row[primaryKey] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Fila borrada.');
      await cargar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const crearFila = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/superadmin/tables/${table}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Fila creada.');
      setNewForm({});
      setCreating(false);
      await cargar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) return <div className="p-8">Cargando…</div>;

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link href="/superadmin" className="text-sm text-gray-500 hover:underline">
              ← Todas las tablas
            </Link>
            <h1 className="text-xl font-bold text-uleam-blue font-mono">{table}</h1>
            <p className="text-xs text-gray-500">
              {total} filas totales · PK: {primaryKey ?? '(ninguna — solo lectura)'}
            </p>
          </div>
          <button
            onClick={() => setCreating((c) => !c)}
            className="bg-uleam-blue text-white px-4 py-2 rounded hover:opacity-90 text-sm"
          >
            {creating ? 'Cancelar' : '+ Nueva fila'}
          </button>
        </div>

        {error && <p className="text-red-600 mb-2 text-sm">{error}</p>}
        {message && <p className="text-green-700 mb-2 text-sm">{message}</p>}

        {creating && (
          <form onSubmit={crearFila} className="bg-white rounded shadow p-4 mb-4 grid grid-cols-3 gap-3">
            {columns.map((col) => (
              <div key={col.column_name}>
                <label className="block text-xs text-gray-500 mb-1">
                  {col.column_name} <span className="text-gray-400">({col.data_type})</span>
                </label>
                <input
                  className="border rounded px-2 py-1 w-full text-sm"
                  value={newForm[col.column_name] ?? ''}
                  onChange={(e) => setNewForm({ ...newForm, [col.column_name]: e.target.value })}
                  placeholder={col.column_default ?? (col.is_nullable === 'YES' ? '(nullable)' : '')}
                />
              </div>
            ))}
            <div className="col-span-3">
              <button type="submit" disabled={loading} className="bg-uleam-blue text-white px-4 py-2 rounded text-sm">
                Guardar
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {columns.map((col) => (
                  <th key={col.column_name} className="px-3 py-2 text-left font-mono text-xs text-gray-600 whitespace-nowrap">
                    {col.column_name}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const rowPk = primaryKey ? row[primaryKey] : i;
                const isEditing = editingPk !== null && primaryKey && row[primaryKey] === editingPk;
                return (
                  <tr key={rowPk} className="border-t">
                    {columns.map((col) => (
                      <td key={col.column_name} className="px-3 py-2 whitespace-nowrap max-w-xs truncate">
                        {isEditing ? (
                          <input
                            className="border rounded px-1 py-0.5 w-full text-xs"
                            value={editForm[col.column_name] ?? ''}
                            disabled={col.column_name === primaryKey}
                            onChange={(e) => setEditForm({ ...editForm, [col.column_name]: e.target.value })}
                          />
                        ) : (
                          <span className="text-xs">{formatCell(row[col.column_name])}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button onClick={guardarEdicion} disabled={loading} className="text-green-700 text-xs hover:underline">
                            Guardar
                          </button>
                          <button onClick={() => setEditingPk(null)} className="text-gray-500 text-xs hover:underline">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {primaryKey && (
                            <button onClick={() => empezarEdicion(row)} className="text-uleam-blue text-xs hover:underline">
                              Editar
                            </button>
                          )}
                          {primaryKey && (
                            <button onClick={() => borrarFila(row)} className="text-red-600 text-xs hover:underline">
                              Borrar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-gray-400">
                    Sin filas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="px-3 py-1 border rounded disabled:opacity-30"
          >
            ← Anterior
          </button>
          <span className="text-gray-500">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="px-3 py-1 border rounded disabled:opacity-30"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCell(value: any): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
