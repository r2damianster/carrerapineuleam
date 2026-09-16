'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AsistenciaPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [espacios, setEspacios] = useState<any[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [presentes, setPresentes] = useState<number[]>([]);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Ventana de 48h: no se puede elegir un día futuro ni uno de más de 2 días atrás
  const fechaMaxima = new Date().toISOString().slice(0, 10);
  const fechaMinima = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin', 'estudiante'].includes(data.usuario.rol)) {
          router.push('/');
          return;
        }
        setCheckingSession(false);
        return fetch('/api/espacios?area=vinculacion').then(r => r.json()).then(d => {
          if (d.success) {
            setEspacios(d.data);
            if (d.data.length === 1) setEspacioId(String(d.data[0].id));
          }
        });
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/asistencia'));
  }, [router]);

  useEffect(() => {
    if (!espacioId) {
      setBeneficiarios([]);
      return;
    }
    fetch(`/api/beneficiarios?espacio_id=${espacioId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setBeneficiarios(d.data);
          setPresentes(d.data.map((b: any) => b.id));
        }
      });
  }, [espacioId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espacioId) {
      setMessage('Error: Selecciona un espacio');
      return;
    }
    if (presentes.length === 0) {
      setMessage('Error: Selecciona al menos un beneficiario presente');
      return;
    }
    if (!horaInicio || !horaFin) {
      setMessage('Error: Ingresa hora de inicio y de fin');
      return;
    }
    if (horaFin <= horaInicio) {
      setMessage('Error: La hora de fin debe ser posterior a la de inicio');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      let fotoUrl: string | null = null;
      let fotoPublicId: string | null = null;
      if (foto) {
        setSubiendoFoto(true);
        const formData = new FormData();
        formData.append('file', foto);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        setSubiendoFoto(false);
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Error subiendo la foto');
        fotoUrl = uploadData.url;
        fotoPublicId = uploadData.public_id;
      }

      const res = await fetch('/api/espacios/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          espacio_id: parseInt(espacioId),
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          beneficiarios_presentes: presentes,
          observaciones,
          foto_url: fotoUrl,
          foto_public_id: fotoPublicId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Asistencia registrada exitosamente — queda pendiente de aprobación del profesor.');
      setPresentes([]);
      setObservaciones('');
      setHoraInicio('');
      setHoraFin('');
      setFoto(null);
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
        <h2 className="text-3xl font-bold text-center text-uleam-blue mb-8">Registrar Asistencia</h2>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Espacio</label>
            <select required value={espacioId} onChange={e => setEspacioId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue">
              <option value="">Selecciona tu espacio...</option>
              {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
            <input
              type="date"
              required
              value={fecha}
              min={fechaMinima}
              max={fechaMaxima}
              onChange={e => setFecha(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue"
            />
            <p className="text-xs text-gray-400 mt-1">Solo puedes registrar asistencia hasta 48 horas después del día del club.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hora de inicio</label>
              <input type="time" required value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hora de fin</label>
              <input type="time" required value={horaFin} onChange={e => setHoraFin(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-4">La duración real (hora de fin − hora de inicio) es la que se acredita como horas al aprobarse.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto de evidencia (opcional)</label>
            <input type="file" accept="image/*" onChange={e => setFoto(e.target.files?.[0] || null)} className="w-full text-sm text-gray-600" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiarios presentes</label>
            <div className="border border-gray-300 rounded-lg p-4 h-56 overflow-y-auto space-y-1">
              {beneficiarios.length === 0 && <p className="text-gray-400 text-sm">{espacioId ? 'Sin beneficiarios inscritos en este espacio.' : 'Selecciona un espacio primero.'}</p>}
              {beneficiarios.map(b => (
                <label key={b.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={presentes.includes(b.id)} onChange={(e) => {
                    if (e.target.checked) setPresentes([...presentes, b.id]);
                    else setPresentes(presentes.filter(id => id !== b.id));
                  }} className="w-5 h-5 accent-uleam-blue" />
                  <span className="text-gray-700">{b.nombres} {b.apellidos}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones (opcional)</label>
            <textarea rows={3} value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue resize-none" />
          </div>

          <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition disabled:opacity-50">
            {subiendoFoto ? 'Subiendo foto...' : loading ? 'Guardando...' : 'Guardar Asistencia'}
          </button>
        </form>
      </div>
    </div>
  );
}
