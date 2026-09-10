'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Actividad {
  id: number;
  fecha: string;
  descripcion: string;
  horas: number;
  espacio_id: number | null;
  espacio_nombre: string | null;
  usuario_id?: number;
  nombres?: string;
  apellidos?: string;
}

export default function InvestigacionActividadesPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [esPasante, setEsPasante] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [form, setForm] = useState({ fecha: '', descripcion: '', horas: '' });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(async data => {
        const usuario = data.usuario;
        const pasanteConInvestigacion = usuario.rol === 'estudiante' && usuario.modulos_acceso?.includes('investigacion');
        const docenteVinculacion = ['profesor', 'admin'].includes(usuario.rol) && usuario.modulos_acceso?.includes('vinculacion');

        if (!pasanteConInvestigacion && !docenteVinculacion) {
          router.push('/portal/dashboard');
          return;
        }
        setEsPasante(pasanteConInvestigacion);
        setCheckingSession(false);
        fetchActividades();
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/investigacion-actividades'));
  }, [router]);

  const fetchActividades = async () => {
    const res = await fetch('/api/actividades-investigacion');
    const data = await res.json();
    if (data.success) setActividades(data.data);
  };

  const handleReportar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/actividades-investigacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: form.fecha,
          descripcion: form.descripcion,
          horas: form.horas,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Actividad registrada');
      setForm({ fecha: '', descripcion: '', horas: '' });
      fetchActividades();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  const totalHoras = actividades.reduce((suma, a) => suma + Number(a.horas), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Actividades de Investigación</h1>
        <p className="text-gray-600 text-sm mb-6">
          {esPasante
            ? 'Registra aquí las actividades de investigación que realizas, además de tus horas de vinculación. Quedan guardadas para un futuro informe — no requieren aprobación.'
            : 'Actividades de investigación reportadas por pasantes de vinculación con funciones de investigación asignadas.'}
        </p>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        {esPasante && (
          <form onSubmit={handleReportar} className="border p-4 rounded-lg bg-gray-50 mb-8 space-y-3">
            <h3 className="font-bold text-gray-800">+ Reportar actividad</h3>
            <div className="grid grid-cols-2 gap-3">
              <input required type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="px-3 py-2 rounded border border-gray-300 outline-none focus:border-uleam-blue" />
              <input required type="number" min="0.5" step="0.5" placeholder="Horas" value={form.horas} onChange={e => setForm({ ...form, horas: e.target.value })} className="px-3 py-2 rounded border border-gray-300 outline-none focus:border-uleam-blue" />
            </div>
            <textarea required placeholder="Descripción de la actividad realizada" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} className="w-full px-3 py-2 rounded border border-gray-300 outline-none focus:border-uleam-blue" />
            <button disabled={loading} className="w-full bg-emerald-600 text-white p-2 rounded font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : 'Registrar Actividad'}
            </button>
          </form>
        )}

        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">{esPasante ? 'Mis actividades reportadas' : 'Actividades reportadas'}</h3>
          <span className="text-sm text-gray-600">Total: {totalHoras} h</span>
        </div>
        {actividades.length === 0 && <p className="text-gray-400 text-sm">Ninguna todavía.</p>}
        <ul className="space-y-2">
          {actividades.map(a => (
            <li key={a.id} className="p-3 border rounded-lg text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">
                  {!esPasante && a.nombres ? `${a.nombres} ${a.apellidos} — ` : ''}
                  {new Date(a.fecha + 'T00:00:00').toLocaleDateString('es-EC')}
                </span>
                <span className="text-emerald-700 font-medium">{a.horas} h</span>
              </div>
              <p className="text-gray-600 mt-1">{a.descripcion}</p>
              {a.espacio_nombre && <p className="text-gray-400 text-xs mt-1">Espacio: {a.espacio_nombre}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
