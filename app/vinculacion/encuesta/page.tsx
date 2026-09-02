'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EnlaceEvaluacionModal from '@/components/EnlaceEvaluacionModal';
import StarRating from '@/components/StarRating';

export default function EncuestaPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [espacios, setEspacios] = useState<any[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [instructores, setInstructores] = useState<any[]>([]);
  const [calificacionesInstructores, setCalificacionesInstructores] = useState<Record<number, number>>({});

  const [formData, setFormData] = useState({
    beneficiario_id: '',
    ciclo_id: '',
    nivel_satisfaccion: 5,
    aprendizaje: 5,
    mejora: 5,
    recursos: 5,
    comentarios: ''
  });
  const [modalEnlace, setModalEnlace] = useState<{ tipo: 'pretest' | 'postest'; beneficiarioId?: number; beneficiarioNombre?: string } | null>(null);

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
          fetch('/api/docencia/ciclos').then(r => r.json()),
        ]).then(([espaciosData, ciclosData]) => {
          if (espaciosData.success) {
            setEspacios(espaciosData.data);
            if (espaciosData.data.length === 1) setEspacioId(String(espaciosData.data[0].id));
          }
          if (ciclosData.success) setCiclos(ciclosData.data);
        });
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/encuesta'));
  }, [router]);

  useEffect(() => {
    if (!espacioId) {
      setBeneficiarios([]);
      setInstructores([]);
      return;
    }
    fetch(`/api/beneficiarios?espacio_id=${espacioId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBeneficiarios(d.data); });
    fetch(`/api/espacios/instructores?espacio_id=${espacioId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setInstructores(d.data);
          setCalificacionesInstructores(Object.fromEntries(d.data.map((i: any) => [i.id, 5])));
        }
      });
  }, [espacioId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espacioId) {
      setMessage('Error: Selecciona un espacio');
      return;
    }
    if (!formData.beneficiario_id || !formData.ciclo_id) {
      setMessage('Error: Selecciona el beneficiario y el ciclo a evaluar.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/encuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiario_id: parseInt(formData.beneficiario_id),
          espacio_id: parseInt(espacioId),
          ciclo_id: parseInt(formData.ciclo_id),
          nivel_satisfaccion: formData.nivel_satisfaccion,
          aprendizaje: formData.aprendizaje,
          mejora: formData.mejora,
          recursos: formData.recursos,
          comentarios: formData.comentarios,
          calificaciones_instructores: calificacionesInstructores,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('¡Gracias! Encuesta registrada.');
      setFormData({ beneficiario_id: '', ciclo_id: '', nivel_satisfaccion: 5, aprendizaje: 5, mejora: 5, recursos: 5, comentarios: '' });
      setCalificacionesInstructores(Object.fromEntries(instructores.map(i => [i.id, 5])));
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md border-t-4 border-yellow-400">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Encuesta de Satisfacción</h2>
        <p className="text-center text-gray-600 mb-4">Tu opinión nos ayuda a mejorar el programa de inglés.</p>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <button type="button" disabled={!espacioId} onClick={() => setModalEnlace({ tipo: 'pretest' })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-uleam-blue hover:bg-uleam-blue/90 disabled:opacity-50">
            🔗 QR Pre-Encuesta (sin login)
          </button>
          <button type="button" disabled={!formData.beneficiario_id}
            onClick={() => setModalEnlace({
              tipo: 'postest',
              beneficiarioId: parseInt(formData.beneficiario_id),
              beneficiarioNombre: beneficiarios.find(b => String(b.id) === formData.beneficiario_id) ? `${beneficiarios.find(b => String(b.id) === formData.beneficiario_id).nombres} ${beneficiarios.find(b => String(b.id) === formData.beneficiario_id).apellidos}` : undefined,
            })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-uleam-blue hover:bg-uleam-blue/90 disabled:opacity-50">
            🔗 QR Post-Encuesta (sin login)
          </button>
        </div>

        {modalEnlace && espacioId && (
          <EnlaceEvaluacionModal
            espacioId={espacioId}
            testTipo="encuesta"
            tipo={modalEnlace.tipo}
            beneficiarioId={modalEnlace.beneficiarioId}
            beneficiarioNombre={modalEnlace.beneficiarioNombre}
            onClose={() => setModalEnlace(null)}
          />
        )}

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700">Espacio</label>
            <select required value={espacioId} onChange={e => setEspacioId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
              <option value="">Selecciona tu espacio...</option>
              {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700">Beneficiario</label>
              <select name="beneficiario_id" required value={formData.beneficiario_id} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="">Selecciona...</option>
                {beneficiarios.map(b => (
                  <option key={b.id} value={b.id}>{b.nombres} {b.apellidos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">Ciclo / Semestre a evaluar</label>
              <select name="ciclo_id" required value={formData.ciclo_id} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="">Selecciona el ciclo...</option>
                {ciclos.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t space-y-6">
            <StarRating label="¿Qué tan satisfecho está el beneficiario con el programa?" value={formData.nivel_satisfaccion} onChange={v => setFormData({ ...formData, nivel_satisfaccion: v })} />
            <StarRating label="¿Sintió que aprendió?" value={formData.aprendizaje} onChange={v => setFormData({ ...formData, aprendizaje: v })} />
            <StarRating label="¿Sintió que mejoró su nivel de inglés?" value={formData.mejora} onChange={v => setFormData({ ...formData, mejora: v })} />
            <StarRating label="¿Cómo calificaría los recursos/materiales usados?" value={formData.recursos} onChange={v => setFormData({ ...formData, recursos: v })} />
            {instructores.length > 0 && (
              <div className="pt-4 border-t space-y-6">
                <p className="text-center text-sm font-semibold text-gray-600">Calificación por instructor</p>
                {instructores.map(i => (
                  <StarRating key={i.id} label={`¿Cómo calificaría a ${i.nombres} ${i.apellidos}?`}
                    value={calificacionesInstructores[i.id] ?? 5}
                    onChange={v => setCalificacionesInstructores({ ...calificacionesInstructores, [i.id]: v })} />
                ))}
              </div>
            )}
          </div>

          <div className="pt-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Comentarios adicionales (Opcional)</label>
            <textarea name="comentarios" rows={4} value={formData.comentarios} onChange={handleChange}
              placeholder="¿Qué le gustó más? ¿Qué podemos mejorar?"
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border"
            ></textarea>
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading}
              className="w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Encuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
