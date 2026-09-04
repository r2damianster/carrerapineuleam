'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface DataTableProps<T> {
  title: string;
  columns: Array<{
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
  }>;
  data: T[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  actionsLabel?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Texto plano de un registro para el buscador — solo campos string/number
// (título, descripción, autores, email, etc.), sin arrays/objetos anidados
// (fotos, expand.category) que no aportan a una búsqueda de texto.
function textoBuscable(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  return Object.values(item as Record<string, unknown>)
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .join(' ')
    .toLowerCase();
}

export default function DataTable<T extends { id: string }>({
  title,
  columns,
  data,
  loading,
  onAdd,
  onEdit,
  onDelete,
  actionsLabel = 'Acciones',
}: DataTableProps<T>) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const handleDelete = (item: T) => {
    if (deleteConfirm === item.id) {
      onDelete(item);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(item.id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando datos...</div>;
  }

  const query = search.trim().toLowerCase();
  const filtered = query ? data.filter((item) => textoBuscable(item).includes(query)) : data;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const desde = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const hasta = Math.min(currentPage * pageSize, filtered.length);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-uleam-blue">{title}</h2>
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition"
        >
          + Nuevo
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar..."
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
          Mostrar
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
            className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          por página
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                  {col.label}
                </th>
              ))}
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">{actionsLabel}</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-gray-500">
                  {data.length === 0
                    ? 'No hay registros aún. Haz clic en "Nuevo" para agregar.'
                    : 'Ningún registro coincide con la búsqueda.'}
                </td>
              </tr>
            ) : (
              paginated.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      {col.render ? col.render(item) : (
                        <span className="text-sm text-gray-700">
                          {(item as any)[col.key] || '-'}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className={`px-3 py-1 rounded transition text-sm font-medium ${
                          deleteConfirm === item.id
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {deleteConfirm === item.id ? '¿Seguro?' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm text-gray-600">
          <span>
            Mostrando {desde}–{hasta} de {filtered.length}
            {query ? ` (filtrado de ${data.length})` : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              ← Anterior
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
