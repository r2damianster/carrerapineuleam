'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ActividadAutonoma {
  id: number;
  fecha: string;
  descripcion: string;
  horas: number;
  estado_aprobacion: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo: string | null;
}

interface ResumenHoras {
  usadas: number;
  aprobadas: number;
  maximo: number;
}

export default function ActividadesAutonomasPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [actividades, setActividades] = useState<ActividadAutonoma[]>([]);
  const [resumen, setResumen] = useState<ResumenHoras | null>(null);
  const [form, setForm] = useState({ fecha: '', descripcion: '', horas: '' });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => {
        // Los supervisores aprueban en /vinculacion/supervisar; esta página es del pasante.
        if (data.usuario.rol !== 'estudiante') {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
        fetchActividades();
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/actividades-autonomas'));
  }, [router]);

  const fetchActividades = async () => {
    const res = await fetch('/api/actividades-autonomas');
    const data = await res.json();
    if (data.success) {
      setActividades(data.data);
      setResumen(data.resumen);
    }
  };

  const handleReportar = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/actividades-autonomas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Actividad registrada. Queda pendiente de aprobación de tu supervisor.');
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

  const horasDisponibles = resumen ? Math.max(0, resumen.maximo - resumen.usadas) : null;
  const cupoAgotado = horasDisponibles !== null && horasDisponibles <= 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Horas / Actividades Autónomas</h1>
        <p className="text-gray-600 text-sm mb-6">
          Registra aquí las actividades que haces por tu cuenta, como planificar clases o crear recursos. Tu supervisor las aprueba
          o rechaza; solo cuentan como horas cuando quedan aprobadas.
        </p>

        {resumen && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="flex justify-between font-semibold mb-2">
              <span>{resumen.usadas} de {resumen.maximo} h registradas</span>
              <span>{resumen.aprobadas} h aprobadas</span>
            </div>
            <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
              <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, (resumen.usadas / resumen.maximo) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs">
              {cupoAgotado
                ? 'Alcanzaste el máximo. Si el supervisor rechaza una actividad, se libera ese cupo.'
                : `Te quedan ${horasDisponibles} h por registrar.`}
            </p>
          </div>
        )}

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleReportar} className="border p-4 rounded-lg bg-gray-50 mb-8 space-y-3">
          <h3 className="font-bold text-gray-800">+ Registrar actividad autónoma</h3>
          <div className="grid grid-cols-2 gap-3">
            <input required type="date" value={form.fecha} onChange={event => setForm({ ...form, fecha: event.target.value })} className="px-3 py-2 rounded border border-gray-300 outline-none focus:border-uleam-blue" />
            <input
              required
              type="number"
              min="0.5"
              max={horasDisponibles ?? undefined}
              step="0.5"
              placeholder="Horas"
              value={form.horas}
              onChange={event => setForm({ ...form, horas: event.target.value })}
              className="px-3 py-2 rounded border border-gray-300 outline-none focus:border-uleam-blue"
            />
          </div>
          <textarea required placeholder="¿Qué hiciste? (ej. planifiqué la clase, creé material didáctico…)" value={form.descripcion} onChange={event => setForm({ ...form, descripcion: event.target.value })} rows={3} className="w-full px-3 py-2 rounded border border-gray-300 outline-none focus:border-uleam-blue" />
          <button disabled={loading || cupoAgotado} className="w-full bg-emerald-600 text-white p-2 rounded font-medium disabled:opacity-50">
            {loading ? 'Guardando...' : 'Registrar Actividad'}
          </button>
        </form>

        <h3 className="font-bold text-gray-800 mb-3">Mis actividades autónomas</h3>
        {actividades.length === 0 && <p className="text-gray-400 text-sm">Ninguna todavía.</p>}
        <ul className="space-y-2">
          {actividades.map(actividad => (
            <li key={actividad.id} className="p-3 border rounded-lg text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{new Date(actividad.fecha + 'T00:00:00').toLocaleDateString('es-EC')}</span>
                <span className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actividad.estado_aprobacion === 'aprobado' ? 'bg-green-100 text-green-800' : actividad.estado_aprobacion === 'rechazado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{actividad.estado_aprobacion}</span>
                  <span className="text-emerald-700 font-medium">{actividad.horas} h</span>
                </span>
              </div>
              <p className="text-gray-600 mt-1">{actividad.descripcion}</p>
              {actividad.estado_aprobacion === 'rechazado' && actividad.motivo_rechazo && (
                <p className="text-red-600 text-xs mt-1">Motivo de rechazo: {actividad.motivo_rechazo}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
