'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { GRADOS_TERCER_NIVEL, GRADOS_CUARTO_NIVEL } from '@/lib/gradosCatalogo';

interface Titulo {
  id: number;
  nivel: 'tercer_nivel' | 'cuarto_nivel';
  tipo: string;
  titulo_especifico: string | null;
  institucion: string | null;
  anio: number | null;
  es_principal: boolean;
}

interface Perfil {
  nombres: string;
  apellidos: string;
  email: string;
  cedula: string | null;
  orcid: string | null;
  genero: string | null;
  fecha_nacimiento: string | null;
  foto_url: string | null;
  titulo_grado: string | null;
  post_grado: string | null;
  cargo_institucional: string | null;
  dependencia: string | null;
  es_director: boolean;
  titulos: Titulo[];
  tieneTarjetaPublica: boolean;
  tienePendientesEnWeb: boolean;
}

const NIVEL_LABEL: Record<string, string> = { tercer_nivel: 'Tercer nivel', cuarto_nivel: 'Cuarto nivel' };

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const [datos, setDatos] = useState({ cedula: '', orcid: '', genero: '', fecha_nacimiento: '', foto_url: '' });
  const [nuevoTitulo, setNuevoTitulo] = useState({ nivel: 'tercer_nivel', tipo: '', titulo_especifico: '', institucion: '', anio: '', es_principal: false });
  const [passwordForm, setPasswordForm] = useState({ password_actual: '', password_nueva: '' });

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/perfil');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando perfil');
      setPerfil(data);
      setDatos({
        cedula: data.cedula || '',
        orcid: data.orcid || '',
        genero: data.genero || '',
        fecha_nacimiento: data.fecha_nacimiento ? String(data.fecha_nacimiento).slice(0, 10) : '',
        foto_url: data.foto_url || '',
      });
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoFoto(true);
    setMensaje('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error subiendo la foto');
      setDatos((prev) => ({ ...prev, foto_url: json.url }));
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setSubiendoFoto(false);
    }
  };

  const guardarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      const res = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error guardando');
      setMensaje('Datos guardados correctamente.');
      await cargar();
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const agregarTitulo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.tipo) {
      setMensaje('Error: selecciona el tipo de título');
      return;
    }
    setGuardando(true);
    setMensaje('');
    try {
      const res = await fetch('/api/perfil/titulos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoTitulo, anio: nuevoTitulo.anio ? parseInt(nuevoTitulo.anio) : null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error agregando título');
      setNuevoTitulo({ nivel: 'tercer_nivel', tipo: '', titulo_especifico: '', institucion: '', anio: '', es_principal: false });
      await cargar();
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const marcarPrincipal = async (titulo: Titulo) => {
    try {
      const res = await fetch(`/api/perfil/titulos/${titulo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ es_principal: true }),
      });
      if (!res.ok) throw new Error('Error al marcar como principal');
      await cargar();
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    }
  };

  const eliminarTitulo = async (titulo: Titulo) => {
    if (!confirm('¿Eliminar este título?')) return;
    try {
      const res = await fetch(`/api/perfil/titulos/${titulo.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      await cargar();
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    }
  };

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      const res = await fetch('/api/perfil/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error cambiando contraseña');
      setMensaje('Contraseña actualizada correctamente.');
      setPasswordForm({ password_actual: '', password_nueva: '' });
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const catalogoPorNivel = nuevoTitulo.nivel === 'tercer_nivel' ? GRADOS_TERCER_NIVEL : GRADOS_CUARTO_NIVEL;

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center mt-16">Cargando...</div>
        <Footer context="general" />
      </>
    );
  }

  if (!perfil) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center mt-16 text-red-600">{mensaje || 'No se pudo cargar el perfil.'}</div>
        <Footer context="general" />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            <p className="text-gray-600 mt-2">{perfil.nombres} {perfil.apellidos} — {perfil.email}</p>
          </div>

          {mensaje && (
            <div className={`p-4 rounded-md ${mensaje.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {mensaje}
            </div>
          )}

          {perfil.tienePendientesEnWeb && (
            <div className="p-4 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              Tienes cambios enviados a tu tarjeta pública del equipo, pendientes de aprobación. No se verán en la web hasta que el administrador del sitio los apruebe.
            </div>
          )}

          {/* Datos personales */}
          <form onSubmit={guardarDatos} className="bg-white rounded-xl p-6 shadow-md space-y-4">
            <h2 className="text-xl font-bold text-uleam-blue">Datos personales</h2>

            <div className="flex items-center gap-4">
              {datos.foto_url ? (
                <img src={datos.foto_url} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto de perfil</label>
                <input type="file" accept="image/*" onChange={handleSubirFoto} disabled={subiendoFoto} className="text-sm" />
                {subiendoFoto && <p className="text-xs text-gray-500 mt-1">Subiendo...</p>}
                {perfil.tieneTarjetaPublica && <p className="text-xs text-gray-400 mt-1">Se publica en la web tras aprobación del administrador del sitio.</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cédula de identidad</label>
              <input type="text" maxLength={10} pattern="\d{10}" title="10 dígitos" value={datos.cedula}
                onChange={(e) => setDatos({ ...datos, cedula: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">ORCID</label>
              <input type="text" placeholder="0000-0000-0000-0000" value={datos.orcid}
                onChange={(e) => setDatos({ ...datos, orcid: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              {perfil.tieneTarjetaPublica && <p className="text-xs text-gray-400 mt-1">Se publica en la web tras aprobación del administrador del sitio.</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Género</label>
                <select value={datos.genero} onChange={(e) => setDatos({ ...datos, genero: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                  <option value="">Sin especificar</option>
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero_no_decir">Prefiero no decir</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de nacimiento</label>
                <input type="date" value={datos.fecha_nacimiento}
                  onChange={(e) => setDatos({ ...datos, fecha_nacimiento: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-600">
              <p><span className="font-medium">Cargo institucional:</span> {perfil.cargo_institucional || '—'}</p>
              <p><span className="font-medium">Dependencia:</span> {perfil.dependencia || '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Estos datos los administra la Dirección de Carrera — contáctalos para corregirlos.</p>
            </div>

            <button type="submit" disabled={guardando}
              className="w-full py-2 px-4 rounded-md text-white bg-uleam-blue hover:bg-uleam-blue/90 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar Datos Personales'}
            </button>
          </form>

          {/* Títulos académicos */}
          <div className="bg-white rounded-xl p-6 shadow-md space-y-4">
            <h2 className="text-xl font-bold text-uleam-blue">Títulos académicos</h2>
            <p className="text-sm text-gray-500">Puedes agregar más de uno por nivel. El marcado como &quot;principal&quot; es el que se usa en documentos oficiales y en tu tarjeta pública (si tienes).</p>

            {(['tercer_nivel', 'cuarto_nivel'] as const).map((nivel) => (
              <div key={nivel}>
                <h3 className="font-bold text-gray-700 mt-4 mb-2">{NIVEL_LABEL[nivel]}</h3>
                {perfil.titulos.filter((t) => t.nivel === nivel).length === 0 && (
                  <p className="text-sm text-gray-400">Sin títulos registrados todavía.</p>
                )}
                <div className="space-y-2">
                  {perfil.titulos.filter((t) => t.nivel === nivel).map((titulo) => (
                    <div key={titulo.id} className="flex items-center justify-between gap-2 border border-gray-200 rounded-md p-3">
                      <div className="text-sm">
                        <p className="font-medium text-gray-800">
                          {titulo.tipo}{titulo.es_principal && <span className="ml-2 text-xs bg-uleam-gold text-uleam-blue px-2 py-0.5 rounded font-bold">Principal</span>}
                        </p>
                        {titulo.titulo_especifico && <p className="text-gray-500">{titulo.titulo_especifico}</p>}
                        {(titulo.institucion || titulo.anio) && (
                          <p className="text-gray-400 text-xs">{[titulo.institucion, titulo.anio].filter(Boolean).join(' · ')}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {!titulo.es_principal && (
                          <button onClick={() => marcarPrincipal(titulo)} type="button" className="text-xs text-uleam-blue hover:underline">Marcar principal</button>
                        )}
                        <button onClick={() => eliminarTitulo(titulo)} type="button" className="text-xs text-red-600 hover:underline">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <form onSubmit={agregarTitulo} className="border-t border-gray-200 pt-4 space-y-3">
              <h3 className="font-bold text-gray-700">Agregar título</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nivel</label>
                  <select value={nuevoTitulo.nivel}
                    onChange={(e) => setNuevoTitulo({ ...nuevoTitulo, nivel: e.target.value, tipo: '' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                    <option value="tercer_nivel">Tercer nivel</option>
                    <option value="cuarto_nivel">Cuarto nivel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select value={nuevoTitulo.tipo} onChange={(e) => setNuevoTitulo({ ...nuevoTitulo, tipo: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                    <option value="">Selecciona...</option>
                    {catalogoPorNivel.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Título específico (opcional)</label>
                <input type="text" placeholder="Ej: Magíster en Docencia e Investigación Educativa"
                  value={nuevoTitulo.titulo_especifico}
                  onChange={(e) => setNuevoTitulo({ ...nuevoTitulo, titulo_especifico: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Institución (opcional)</label>
                  <input type="text" value={nuevoTitulo.institucion}
                    onChange={(e) => setNuevoTitulo({ ...nuevoTitulo, institucion: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Año (opcional)</label>
                  <input type="number" value={nuevoTitulo.anio}
                    onChange={(e) => setNuevoTitulo({ ...nuevoTitulo, anio: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={nuevoTitulo.es_principal}
                  onChange={(e) => setNuevoTitulo({ ...nuevoTitulo, es_principal: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Marcar como principal de este nivel</span>
              </label>
              <button type="submit" disabled={guardando}
                className="w-full py-2 px-4 rounded-md text-white bg-uleam-blue hover:bg-uleam-blue/90 disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Agregar Título'}
              </button>
            </form>
          </div>

          {/* Cambiar contraseña */}
          <form onSubmit={cambiarPassword} className="bg-white rounded-xl p-6 shadow-md space-y-4">
            <h2 className="text-xl font-bold text-uleam-blue">Cambiar contraseña</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña actual</label>
              <input type="password" required value={passwordForm.password_actual}
                onChange={(e) => setPasswordForm({ ...passwordForm, password_actual: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nueva contraseña</label>
              <input type="password" required minLength={6} value={passwordForm.password_nueva}
                onChange={(e) => setPasswordForm({ ...passwordForm, password_nueva: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <button type="submit" disabled={guardando}
              className="w-full py-2 px-4 rounded-md text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        </div>
      </div>
      <Footer context="general" />
    </>
  );
}
