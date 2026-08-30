'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DocenciaDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'espacios' | 'asignar'>('espacios');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [usuario, setUsuario] = useState<{ nombres: string; rol: string } | null>(null);

  // Data states
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [espacios, setEspacios] = useState<any[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);

  // Tab 1: Espacios
  const [espacioForm, setEspacioForm] = useState({ nombre: '', tipo: 'aula', ciclo_id: '' });

  // Tab 2: Asignar
  const [asignarForm, setAsignarForm] = useState({ espacio_id: '' });
  const [selectedBens, setSelectedBens] = useState<number[]>([]);

  const puedeCrearEspacios = usuario ? ['profesor', 'admin'].includes(usuario.rol) : false;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin', 'estudiante'].includes(data.usuario.rol)) {
          router.push('/');
          return;
        }
        setUsuario(data.usuario);
        if (!['profesor', 'admin'].includes(data.usuario.rol)) {
          setTab('asignar');
        }
        setCheckingSession(false);
        fetchData();
      })
      .catch(() => router.push('/login?redirect=/docencia'));
  }, [router]);

  const fetchData = async () => {
    try {
      const [resCiclos, resEspacios, resBens] = await Promise.all([
        fetch('/api/docencia/ciclos'),
        fetch('/api/docencia/espacios'),
        fetch('/api/beneficiarios')
      ]);
      const [dataCiclos, dataEspacios, dataBens] = await Promise.all([
        resCiclos.json(), resEspacios.json(), resBens.json()
      ]);

      if (dataCiclos.success) setCiclos(dataCiclos.data);
      if (dataEspacios.success) setEspacios(dataEspacios.data);
      if (dataBens.success) setBeneficiarios(dataBens.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateEspacio = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/docencia/espacios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(espacioForm)
      });
      if (!res.ok) throw new Error('Error creando espacio');
      setMessage('Espacio creado');
      fetchData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/docencia/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          espacio_id: asignarForm.espacio_id,
          beneficiarios_ids: selectedBens
        })
      });
      if (!res.ok) throw new Error('Error asignando beneficiarios');
      setMessage('Beneficiarios asignados correctamente');
      setSelectedBens([]);
      fetchData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Panel Docente</h1>
          {usuario && <span className="text-sm text-gray-600">{usuario.nombres}</span>}
        </div>

        {message && (
          <div className="p-4 mb-4 bg-blue-100 text-blue-800 rounded">{message}</div>
        )}

        <div className="flex space-x-4 mb-6 border-b">
          {puedeCrearEspacios && (
            <button onClick={() => setTab('espacios')} className={`pb-2 px-4 ${tab === 'espacios' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>1. Crear Espacios</button>
          )}
          <button onClick={() => setTab('asignar')} className={`pb-2 px-4 ${tab === 'asignar' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>{puedeCrearEspacios ? '2. Asignar Beneficiarios' : 'Asignar Beneficiarios'}</button>
        </div>

        {tab === 'espacios' && puedeCrearEspacios && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <form onSubmit={handleCreateEspacio} className="space-y-4 border p-4 rounded bg-gray-50">
              <h3 className="font-bold text-lg">Nuevo Espacio de Enseñanza</h3>
              <input required placeholder="Nombre (Ej. Nivel 1 A)" className="w-full border p-2 rounded" value={espacioForm.nombre} onChange={e => setEspacioForm({...espacioForm, nombre: e.target.value})} />
              <select required className="w-full border p-2 rounded" value={espacioForm.tipo} onChange={e => setEspacioForm({...espacioForm, tipo: e.target.value})}>
                <option value="aula">Aula Virtual/Física</option>
                <option value="comunidad">Encuentro Comunitario</option>
              </select>
              <select required className="w-full border p-2 rounded" value={espacioForm.ciclo_id} onChange={e => setEspacioForm({...espacioForm, ciclo_id: e.target.value})}>
                <option value="">Selecciona Ciclo</option>
                {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">Crear Espacio</button>
            </form>

            <div>
              <h3 className="font-bold text-lg mb-2">Espacios Actuales</h3>
              <ul className="space-y-2">
                {espacios.map(e => (
                  <li key={e.id} className="p-3 border rounded shadow-sm">
                    <strong>{e.nombre}</strong> ({e.tipo}) - Ciclo: {e.ciclo_nombre} <br/>
                    <span className="text-sm text-gray-500">{e.inscritos} alumnos inscritos</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'asignar' && (
          <form onSubmit={handleAsignar} className="space-y-6">
            <h3 className="font-bold text-lg">Inscribir Beneficiarios a un Espacio</h3>
            <select required className="w-full border p-2 rounded" value={asignarForm.espacio_id} onChange={e => setAsignarForm({espacio_id: e.target.value})}>
              <option value="">Seleccione el Espacio...</option>
              {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>

            <div className="border p-4 rounded h-64 overflow-y-auto">
              <p className="font-semibold mb-2">Selecciona los alumnos:</p>
              {beneficiarios.map(b => (
                <label key={b.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100">
                  <input type="checkbox"
                    checked={selectedBens.includes(b.id)}
                    onChange={(e) => {
                      if(e.target.checked) setSelectedBens([...selectedBens, b.id]);
                      else setSelectedBens(selectedBens.filter(id => id !== b.id));
                    }}
                  />
                  <span>{b.nombres} {b.apellidos}</span>
                </label>
              ))}
            </div>
            <button disabled={loading || selectedBens.length === 0} className="w-full bg-blue-600 text-white p-2 rounded">Inscribir Seleccionados</button>
          </form>
        )}
      </div>
    </div>
  );
}
