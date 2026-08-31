'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface FilaPreview {
  nombres: string;
  apellidos: string;
  email: string;
  status: 'ok' | 'error' | 'creado' | 'omitido';
  motivo?: string;
}

export default function PasantesPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [estudiantes, setEstudiantes] = useState<any[]>([]);

  const [nuevoForm, setNuevoForm] = useState({ nombres: '', apellidos: '', email: '' });
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nombres: '', apellidos: '', email: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<FilaPreview[] | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin'].includes(data.usuario.rol) || !data.usuario.modulos_acceso?.includes('vinculacion')) {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
        return fetchEstudiantes();
      })
      .catch(() => router.push('/login?redirect=/vinculacion/pasantes'));
  }, [router]);

  const fetchEstudiantes = async () => {
    const res = await fetch('/api/estudiantes');
    const data = await res.json();
    if (data.success) setEstudiantes(data.data);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/estudiantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Pasante "${data.data.nombres} ${data.data.apellidos}" registrado — pendiente de activar`);
      setNuevoForm({ nombres: '', apellidos: '', email: '' });
      fetchEstudiantes();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const empezarEdicion = (s: any) => {
    setEditandoId(s.id);
    setEditForm({ nombres: s.nombres, apellidos: s.apellidos, email: s.email });
  };

  const handleGuardarEdicion = async (id: number) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/estudiantes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Pasante actualizado');
      setEditandoId(null);
      fetchEstudiantes();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}? Se quita también de cualquier espacio donde sea instructor.`)) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/estudiantes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Pasante eliminado');
      fetchEstudiantes();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarPlantilla = () => {
    const hoja = XLSX.utils.aoa_to_sheet([
      ['Nombres', 'Apellidos', 'Email'],
      ['Juan', 'Pérez', 'juan.perez@uleam.edu.ec'],
    ]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Pasantes');
    XLSX.writeFile(libro, 'plantilla-pasantes.xlsx');
  };

  const normalizarFila = (fila: Record<string, any>) => {
    const clave = (nombres: string[]) => {
      const llave = Object.keys(fila).find(k => nombres.includes(k.trim().toLowerCase()));
      return llave ? String(fila[llave] ?? '').trim() : '';
    };
    return {
      nombres: clave(['nombres', 'nombre']),
      apellidos: clave(['apellidos', 'apellido']),
      email: clave(['email', 'correo', 'correo electrónico', 'correo electronico']),
    };
  };

  const handleArchivoSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setCargandoArchivo(true);
    setMessage('');
    setPreview(null);
    setConfirmado(false);
    try {
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: 'array' });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const filasCrudas: Record<string, any>[] = XLSX.utils.sheet_to_json(hoja);
      const filas = filasCrudas.map(normalizarFila);

      if (filas.length === 0) {
        setMessage('Error: el archivo no tiene filas');
        return;
      }

      const res = await fetch('/api/estudiantes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: filas, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data.data);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setCargandoArchivo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmarCargaMasiva = async () => {
    if (!preview) return;
    const filasValidas = preview.filter(f => f.status === 'ok');
    if (filasValidas.length === 0) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/estudiantes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: filasValidas, dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data.data);
      setConfirmado(true);
      const creados = data.data.filter((f: FilaPreview) => f.status === 'creado').length;
      setMessage(`${creados} pasante(s) registrado(s) — pendientes de activar`);
      fetchEstudiantes();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cancelarCargaMasiva = () => {
    setPreview(null);
    setConfirmado(false);
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Administrar Pasantes</h1>
        <p className="text-gray-600 text-sm mb-6">
          Registra solo nombres, apellidos y email — el pasante define su propia clave la primera vez que entra en{' '}
          <Link href="/portal/login" className="text-blue-600 hover:underline">/portal/login</Link>. Nadie más puede registrarse como estudiante.
        </p>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleCrear} className="border p-4 rounded-lg bg-gray-50 mb-8 space-y-3">
          <h3 className="font-bold text-gray-800">+ Agregar Pasante</h3>
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Nombres" value={nuevoForm.nombres} onChange={e => setNuevoForm({ ...nuevoForm, nombres: e.target.value })} className="px-3 py-2 rounded border border-gray-300 outline-none focus:border-uleam-blue" />
            <input required placeholder="Apellidos" value={nuevoForm.apellidos} onChange={e => setNuevoForm({ ...nuevoForm, apellidos: e.target.value })} className="px-3 py-2 rounded border border-gray-300 outline-none focus:border-uleam-blue" />
          </div>
          <input required type="email" placeholder="Email institucional" value={nuevoForm.email} onChange={e => setNuevoForm({ ...nuevoForm, email: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 outline-none focus:border-uleam-blue" />
          <button disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded font-medium disabled:opacity-50">
            {loading ? 'Guardando...' : 'Registrar Pasante'}
          </button>
        </form>

        <div className="border p-4 rounded-lg bg-gray-50 mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Carga Masiva por Excel</h3>
            <button type="button" onClick={handleDescargarPlantilla} className="text-sm text-blue-600 hover:underline">
              Descargar plantilla
            </button>
          </div>
          <p className="text-sm text-gray-600">Sube un .xlsx con columnas Nombres, Apellidos, Email. Se muestra vista previa antes de crear nada.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleArchivoSeleccionado}
            disabled={cargandoArchivo}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:font-medium file:cursor-pointer"
          />
          {cargandoArchivo && <p className="text-sm text-gray-500">Procesando archivo...</p>}

          {preview && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-1 pr-3">Nombres</th>
                      <th className="py-1 pr-3">Apellidos</th>
                      <th className="py-1 pr-3">Email</th>
                      <th className="py-1">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((fila, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-1 pr-3">{fila.nombres}</td>
                        <td className="py-1 pr-3">{fila.apellidos}</td>
                        <td className="py-1 pr-3">{fila.email}</td>
                        <td className="py-1">
                          {fila.status === 'ok' && <span className="text-green-700">✅ OK</span>}
                          {fila.status === 'creado' && <span className="text-green-700">✅ Creado</span>}
                          {fila.status === 'error' && <span className="text-red-600">❌ {fila.motivo}</span>}
                          {fila.status === 'omitido' && <span className="text-red-600">❌ Omitido — {fila.motivo}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!confirmado ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmarCargaMasiva}
                    disabled={loading || preview.filter(f => f.status === 'ok').length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : `Confirmar y Crear (${preview.filter(f => f.status === 'ok').length} válidos)`}
                  </button>
                  <button onClick={cancelarCargaMasiva} className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button onClick={cancelarCargaMasiva} className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium">
                  Cerrar
                </button>
              )}
            </div>
          )}
        </div>

        <h3 className="font-bold text-gray-800 mb-3">Pasantes registrados</h3>
        {estudiantes.length === 0 && <p className="text-gray-400 text-sm">Ninguno todavía.</p>}
        <ul className="space-y-3">
          {estudiantes.map(s => (
            <li key={s.id} className="p-4 border rounded-lg">
              {editandoId === s.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editForm.nombres} onChange={e => setEditForm({ ...editForm, nombres: e.target.value })} className="px-2 py-1 rounded border border-gray-300" />
                    <input value={editForm.apellidos} onChange={e => setEditForm({ ...editForm, apellidos: e.target.value })} className="px-2 py-1 rounded border border-gray-300" />
                  </div>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-2 py-1 rounded border border-gray-300" />
                  <div className="flex gap-2">
                    <button onClick={() => handleGuardarEdicion(s.id)} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Guardar</button>
                    <button onClick={() => setEditandoId(null)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {s.nombres} {s.apellidos}{' '}
                      {s.activado
                        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-1">Activo</span>
                        : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-1">Pendiente de activar</span>}
                    </p>
                    <p className="text-sm text-gray-500">{s.email}</p>
                    {s.espacios && s.espacios.length > 0 ? (
                      <p className="text-sm text-gray-600 mt-1">Instructor en: {s.espacios.map((e: any) => e.nombre).join(', ')}</p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">Sin espacio asignado</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => empezarEdicion(s)} className="text-sm text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => handleEliminar(s.id, `${s.nombres} ${s.apellidos}`)} className="text-sm text-red-600 hover:underline">Eliminar</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
