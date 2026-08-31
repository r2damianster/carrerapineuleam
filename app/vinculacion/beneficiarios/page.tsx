'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BeneficiariosPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [modo, setModo] = useState<'asignar' | 'nuevo'>('asignar');

  const [espacios, setEspacios] = useState<any[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [todosBeneficiarios, setTodosBeneficiarios] = useState<any[]>([]);
  const [selectedBens, setSelectedBens] = useState<number[]>([]);

  const [nuevoForm, setNuevoForm] = useState({ nombres: '', apellidos: '', contacto: '', situacion_laboral: '', email: '' });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin', 'estudiante'].includes(data.usuario.rol)) {
          router.push('/');
          return;
        }
        setCheckingSession(false);
        return Promise.all([
          fetch('/api/espacios?area=vinculacion').then(r => r.json()),
          fetch('/api/beneficiarios').then(r => r.json()),
        ]).then(([espaciosData, benData]) => {
          if (espaciosData.success) {
            setEspacios(espaciosData.data);
            if (espaciosData.data.length === 1) setEspacioId(String(espaciosData.data[0].id));
          }
          if (benData.success) setTodosBeneficiarios(benData.data);
        });
      })
      .catch(() => router.push('/login?redirect=/vinculacion/beneficiarios'));
  }, [router]);

  useEffect(() => {
    if (!espacioId) {
      setInscritos([]);
      return;
    }
    fetch(`/api/beneficiarios?espacio_id=${espacioId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setInscritos(d.data); });
  }, [espacioId]);

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espacioId || selectedBens.length === 0) {
      setMessage('Error: Selecciona un espacio y al menos un beneficiario');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/espacios/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espacio_id: parseInt(espacioId), beneficiarios_ids: selectedBens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Beneficiarios asignados correctamente');
      setSelectedBens([]);
      fetch(`/api/beneficiarios?espacio_id=${espacioId}`).then(r => r.json()).then(d => { if (d.success) setInscritos(d.data); });
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espacioId) {
      setMessage('Error: Selecciona un espacio');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/beneficiarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoForm, espacio_id: parseInt(espacioId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Beneficiario "${data.data.nombres} ${data.data.apellidos}" registrado y asignado`);
      setNuevoForm({ nombres: '', apellidos: '', contacto: '', situacion_laboral: '', email: '' });
      fetch(`/api/beneficiarios?espacio_id=${espacioId}`).then(r => r.json()).then(d => { if (d.success) setInscritos(d.data); });
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h2 className="text-3xl font-bold text-center text-uleam-blue mb-6">Beneficiarios</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Espacio</label>
          <select required value={espacioId} onChange={e => setEspacioId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue mb-6">
            <option value="">Selecciona tu espacio...</option>
            {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="flex gap-4 mb-6 border-b">
          <button type="button" onClick={() => setModo('asignar')} className={`pb-2 px-2 ${modo === 'asignar' ? 'border-b-2 border-uleam-blue font-bold text-uleam-blue' : 'text-gray-500'}`}>Asignar existente</button>
          <button type="button" onClick={() => setModo('nuevo')} className={`pb-2 px-2 ${modo === 'nuevo' ? 'border-b-2 border-uleam-blue font-bold text-uleam-blue' : 'text-gray-500'}`}>Registrar nuevo</button>
        </div>

        {modo === 'asignar' && (
          <form onSubmit={handleAsignar} className="space-y-4">
            <div className="border border-gray-300 rounded-lg p-4 h-56 overflow-y-auto space-y-1">
              {todosBeneficiarios.map(b => (
                <label key={b.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selectedBens.includes(b.id)} onChange={(e) => {
                    if (e.target.checked) setSelectedBens([...selectedBens, b.id]);
                    else setSelectedBens(selectedBens.filter(id => id !== b.id));
                  }} className="w-5 h-5 accent-uleam-blue" />
                  <span className="text-gray-700">{b.nombres} {b.apellidos}</span>
                </label>
              ))}
            </div>
            <button disabled={loading} className="w-full px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition disabled:opacity-50">
              {loading ? 'Asignando...' : 'Asignar Seleccionados'}
            </button>

            <h4 className="font-semibold text-gray-700 mt-6">Ya inscritos en este espacio ({inscritos.length})</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {inscritos.map(b => <li key={b.id}>{b.nombres} {b.apellidos}</li>)}
            </ul>
          </form>
        )}

        {modo === 'nuevo' && (
          <form onSubmit={handleNuevo} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input required placeholder="Nombres" value={nuevoForm.nombres} onChange={e => setNuevoForm({ ...nuevoForm, nombres: e.target.value })} className="px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              <input required placeholder="Apellidos" value={nuevoForm.apellidos} onChange={e => setNuevoForm({ ...nuevoForm, apellidos: e.target.value })} className="px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            </div>
            <input placeholder="Contacto (teléfono)" value={nuevoForm.contacto} onChange={e => setNuevoForm({ ...nuevoForm, contacto: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            <input placeholder="Situación laboral inicial" value={nuevoForm.situacion_laboral} onChange={e => setNuevoForm({ ...nuevoForm, situacion_laboral: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            <input type="email" placeholder="Email (opcional)" value={nuevoForm.email} onChange={e => setNuevoForm({ ...nuevoForm, email: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            <p className="text-xs text-gray-500">El beneficiario no inicia sesión en el sistema — este registro es solo para llevar sus datos y evaluarlo.</p>
            <button disabled={loading} className="w-full px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition disabled:opacity-50">
              {loading ? 'Registrando...' : 'Registrar y Asignar a este Espacio'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
