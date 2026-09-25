'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserItem {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  cedula: string | null;
  rol: string;
  modulos_acceso: string[] | null;
  activado: boolean;
}

const ROLES_DISPONIBLES = [
  { id: 'profesor', label: 'Profesor / Docente' },
  { id: 'secretaria', label: 'Secretaria' },
  { id: 'estudiante', label: 'Estudiante / Pasante' },
  { id: 'admin', label: 'Administrador' },
  { id: 'beneficiario', label: 'Beneficiario' },
];

const MODULOS_DISPONIBLES = [
  { id: 'vinculacion', label: 'Vinculación' },
  { id: 'investigacion', label: 'Investigación' },
  { id: 'subir_video', label: 'Subir Video / Podcast' },
  { id: 'admin', label: 'Módulo Admin' },
  { id: 'superadmin', label: 'Superadmin' },
];

export default function VerComoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [error, setError] = useState('');
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  // Filtro 1: Casillas de verificación (Roles y Módulos)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedModulos, setSelectedModulos] = useState<string[]>([]);
  const [filterMultiAccess, setFilterMultiAccess] = useState<'all' | 'multi' | 'single'>('all');

  // Filtro 2: Persona (Texto de búsqueda)
  const [searchPersona, setSearchPersona] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const isSuper = data?.usuario?.modulos_acceso?.includes('superadmin') || !!data?.usuario?.impersonatedBy;
        if (!isSuper) {
          router.push('/portal/dashboard');
          return;
        }
        return fetch('/api/superadmin/impersonate/users')
          .then((res) => res.json())
          .then((d) => {
            if (d.error) throw new Error(d.error);
            setUsers(d.users || []);
            setLoading(false);
          });
      })
      .catch((err) => {
        setError(err?.message || 'Error de autenticación');
        setLoading(false);
      });
  }, [router]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const toggleModulo = (moduloId: string) => {
    setSelectedModulos((prev) =>
      prev.includes(moduloId) ? prev.filter((m) => m !== moduloId) : [...prev, moduloId]
    );
  };

  const clearFilters = () => {
    setSelectedRoles([]);
    setSelectedModulos([]);
    setFilterMultiAccess('all');
    setSearchPersona('');
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const userModulos = u.modulos_acceso || [];

      // Filtro 1a: Roles
      if (selectedRoles.length > 0 && !selectedRoles.includes(u.rol)) {
        return false;
      }

      // Filtro 1b: Módulos de acceso
      if (selectedModulos.length > 0) {
        const hasAnyModulo = selectedModulos.some((m) => userModulos.includes(m));
        if (!hasAnyModulo) return false;
      }

      // Filtro 1c: Multi-acceso vs Acceso Único
      if (filterMultiAccess === 'multi' && userModulos.length < 2) {
        return false;
      }
      if (filterMultiAccess === 'single' && userModulos.length >= 2) {
        return false;
      }

      // Filtro 2: Persona (Nombre, Email, Cédula)
      if (searchPersona.trim()) {
        const q = searchPersona.toLowerCase().trim();
        const fullName = `${u.nombres} ${u.apellidos}`.toLowerCase();
        const email = u.email.toLowerCase();
        const cedula = (u.cedula || '').toLowerCase();
        const matchesName = fullName.includes(q);
        const matchesEmail = email.includes(q);
        const matchesCedula = cedula.includes(q);

        if (!matchesName && !matchesEmail && !matchesCedula) {
          return false;
        }
      }

      return true;
    });
  }, [users, selectedRoles, selectedModulos, filterMultiAccess, searchPersona]);

  const handleImpersonate = async (targetUserId: number) => {
    setImpersonatingId(targetUserId);
    setError('');
    try {
      const res = await fetch('/api/superadmin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al impersonar usuario');

      if (data.redirect) {
        window.location.href = data.redirect;
      }
    } catch (err: any) {
      setError(err.message);
      setImpersonatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-gray-600 font-medium">Cargando directorio de usuarios…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-uleam-blue flex items-center gap-2">
              <span>👁️</span> Ver como — Impersonación de Usuarios
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Selecciona un usuario para identificarte temporalmente como él. Podrás verificar y cambiar detalles en su perfil, contribuciones y actividades.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/superadmin"
              className="text-sm border border-gray-300 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded transition-colors"
            >
              ← Volver a Superadmin
            </Link>
            <Link
              href="/portal/dashboard"
              className="text-sm bg-uleam-blue text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
            >
              Ir al Portal
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Panel de Filtros Dobles */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Filtro 1: Casillas por Rol y Módulo */}
          <div className="md:col-span-7 bg-white p-5 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <span>1️⃣</span> Filtro por Rol y Módulos de Acceso
              </h2>
              {(selectedRoles.length > 0 || selectedModulos.length > 0 || filterMultiAccess !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedRoles([]);
                    setSelectedModulos([]);
                    setFilterMultiAccess('all');
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Limpiar casillas
                </button>
              )}
            </div>

            {/* Checkboxes de Roles */}
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Rol Principal:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {ROLES_DISPONIBLES.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2 text-xs sm:text-sm p-2 rounded cursor-pointer border transition-colors ${
                      selectedRoles.includes(r.id)
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                      className="rounded text-uleam-blue focus:ring-uleam-blue h-4 w-4"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Checkboxes de Módulos */}
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Módulos de Acceso Asignados:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MODULOS_DISPONIBLES.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 text-xs p-2 rounded cursor-pointer border transition-colors ${
                      selectedModulos.includes(m.id)
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModulos.includes(m.id)}
                      onChange={() => toggleModulo(m.id)}
                      className="rounded text-emerald-600 focus:ring-emerald-600 h-4 w-4"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Multi-acceso selector */}
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Análisis de Cobertura de Accesos:
              </span>
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="multiAccess"
                    checked={filterMultiAccess === 'all'}
                    onChange={() => setFilterMultiAccess('all')}
                  />
                  <span>Todos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-indigo-700 font-medium">
                  <input
                    type="radio"
                    name="multiAccess"
                    checked={filterMultiAccess === 'multi'}
                    onChange={() => setFilterMultiAccess('multi')}
                  />
                  <span>Accesos múltiples (2+ módulos)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                  <input
                    type="radio"
                    name="multiAccess"
                    checked={filterMultiAccess === 'single'}
                    onChange={() => setFilterMultiAccess('single')}
                  />
                  <span>Acceso único / básico (&lt; 2 módulos)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Filtro 2: Persona (Buscador) */}
          <div className="md:col-span-5 bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <span>2️⃣</span> Filtro por Persona
                </h2>
                {searchPersona && (
                  <button onClick={() => setSearchPersona('')} className="text-xs text-red-600 hover:underline">
                    Limpiar texto
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500">
                Busca directamente por nombre, apellido, correo institucional o cédula de la persona.
              </p>

              <div>
                <input
                  type="text"
                  placeholder="Ej: Arturo Rodríguez, e1314687524..."
                  value={searchPersona}
                  onChange={(e) => setSearchPersona(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uleam-blue focus:border-transparent"
                />
              </div>
            </div>

            {/* Resumen de resultados */}
            <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-gray-600">
              <span>
                Mostrando <strong className="text-gray-900">{filteredUsers.length}</strong> de{' '}
                <strong className="text-gray-900">{users.length}</strong> usuarios
              </span>
              {(selectedRoles.length > 0 || selectedModulos.length > 0 || filterMultiAccess !== 'all' || searchPersona) && (
                <button
                  onClick={clearFilters}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-2 py-1 rounded transition-colors"
                >
                  Limpiar todos los filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Persona</th>
                  <th className="py-3 px-4">Correo / Cédula</th>
                  <th className="py-3 px-4">Rol Principal</th>
                  <th className="py-3 px-4">Módulos de Acceso</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No se encontraron usuarios que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isBeingImpersonated = impersonatingId === u.id;
                    const modulos = u.modulos_acceso || [];

                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">
                            {u.nombres} {u.apellidos}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">ID: {u.id}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-gray-800 font-mono text-xs">{u.email}</div>
                          {u.cedula && <div className="text-xs text-gray-500">Cédula: {u.cedula}</div>}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                              u.rol === 'profesor'
                                ? 'bg-blue-100 text-blue-800'
                                : u.rol === 'estudiante'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.rol === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {u.rol}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {modulos.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">Ninguno</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {modulos.map((m) => (
                                <span
                                  key={m}
                                  className="bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded text-[11px]"
                                >
                                  {m}
                                </span>
                              ))}
                              {modulos.length >= 2 && (
                                <span className="bg-indigo-100 text-indigo-800 font-semibold px-1.5 py-0.5 rounded text-[10px]" title="Tiene múltiple acceso a módulos">
                                  ⚡ Multi
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {u.activado ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Pendiente
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleImpersonate(u.id)}
                            disabled={isBeingImpersonated}
                            className="bg-uleam-blue hover:bg-uleam-blue/90 text-white text-xs font-medium px-3 py-1.5 rounded transition-all shadow-sm flex items-center gap-1.5 ml-auto disabled:opacity-50"
                          >
                            <span>👁️</span>
                            <span>{isBeingImpersonated ? 'Ingresando...' : 'Ver como'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

