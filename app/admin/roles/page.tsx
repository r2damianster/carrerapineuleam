'use client';

import { useEffect, useMemo, useState } from 'react';
import { MODULOS, MODULOS_ASIGNABLES } from '@/lib/modulos';

interface UsuarioRol {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
  activado: boolean;
  modulos_acceso: string[];
  modulos_derivados?: string[];
  cargo_institucional: string | null;
}

// Módulos que se pueden asignar a un pasante (rol estudiante).
const MODULOS_PASANTE = ['subir_video', 'investigacion'];

export default function RolesPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRol[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<'todos' | 'docentes' | 'pasantes'>('docentes');
  const [guardandoId, setGuardandoId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/roles')
      .then(res => res.json())
      .then(data => {
        if (data.success) setUsuarios(data.data);
        else setMensaje(data.error || 'No se pudieron cargar los usuarios');
      })
      .catch(() => setMensaje('Error de red al cargar usuarios'))
      .finally(() => setLoading(false));
  }, []);

  const alternarModulo = async (usuario: UsuarioRol, moduloId: string) => {
    const tieneActual = usuario.modulos_acceso.includes(moduloId);
    let nuevos = tieneActual
      ? usuario.modulos_acceso.filter(modulo => modulo !== moduloId)
      : [...usuario.modulos_acceso, moduloId];
    // Quitar Supervisor también quita Líder (el líder implica supervisor).
    if (moduloId === 'vinculacion' && tieneActual) nuevos = nuevos.filter(modulo => modulo !== 'vinculacion_gestion');
    // Marcar Líder marca Supervisor.
    if (moduloId === 'vinculacion_gestion' && !tieneActual && !nuevos.includes('vinculacion')) nuevos.push('vinculacion');

    setGuardandoId(usuario.id);
    setMensaje('');
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: usuario.id, modulos: nuevos.filter(modulo => MODULOS_ASIGNABLES.includes(modulo)) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsuarios(previos => previos.map(u => (u.id === usuario.id ? { ...u, modulos_acceso: data.modulos_acceso } : u)));
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setGuardandoId(null);
    }
  };

  const usuariosVisibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return usuarios.filter(usuario => {
      if (filtroRol === 'docentes' && usuario.rol === 'estudiante') return false;
      if (filtroRol === 'pasantes' && usuario.rol !== 'estudiante') return false;
      if (!termino) return true;
      return `${usuario.nombres} ${usuario.apellidos} ${usuario.email}`.toLowerCase().includes(termino);
    });
  }, [usuarios, busqueda, filtroRol]);

  if (loading) return <div className="p-8 text-gray-500">Cargando usuarios...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Roles y usuarios</h1>
      <p className="text-sm text-gray-600 mb-4">
        Marca o desmarca los módulos de cada persona. Los cambios se guardan al instante y se aplican la próxima vez que abra su
        Portal (sin necesidad de volver a iniciar sesión). Todo docente ve siempre Yo y la Carrera, Dashboard PINE y Utilidades.
      </p>

      {mensaje && <div className="p-3 mb-4 rounded-md bg-red-50 text-red-700 text-sm">{mensaje}</div>}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o correo"
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm w-72"
        />
        <select value={filtroRol} onChange={e => setFiltroRol(e.target.value as any)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
          <option value="docentes">Docentes</option>
          <option value="pasantes">Pasantes</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left px-4 py-3">Persona</th>
              {MODULOS.map(modulo => (
                <th key={modulo.id} className="px-3 py-3 text-center align-bottom" title={modulo.descripcion}>
                  <span className="block leading-tight">{modulo.etiqueta}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuariosVisibles.map(usuario => {
              const esPasante = usuario.rol === 'estudiante';
              return (
                <tr key={usuario.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{usuario.nombres} {usuario.apellidos}</div>
                    <div className="text-xs text-gray-500">
                      {usuario.email}
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{esPasante ? 'pasante' : 'docente'}</span>
                      {!usuario.activado && <span className="ml-1 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">sin activar</span>}
                    </div>
                  </td>
                  {MODULOS.map(modulo => {
                    const marcado = usuario.modulos_acceso.includes(modulo.id);
                    const bloqueado = !modulo.asignable || (esPasante && !MODULOS_PASANTE.includes(modulo.id)) || guardandoId === usuario.id;
                    return (
                      <td key={modulo.id} className="px-3 py-3 text-center">
                        {modulo.id === 'superadmin' ? (
                          marcado ? <span title="Solo por doble candado">🔒</span> : <span className="text-gray-300">—</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={marcado}
                            disabled={bloqueado}
                            onChange={() => alternarModulo(usuario, modulo.id)}
                            className="h-4 w-4 accent-blue-700 disabled:opacity-30"
                          />
                        )}
                        {modulo.id !== 'superadmin' && usuario.modulos_derivados?.includes(modulo.id) && (
                          <span className="ml-1 text-[10px] font-semibold text-emerald-600" title="Lo concede su rol en un proyecto. Desmarcarlo lo excluye a mano.">auto</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {usuariosVisibles.length === 0 && (
              <tr><td colSpan={MODULOS.length + 1} className="px-4 py-6 text-center text-gray-400">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
