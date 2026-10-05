'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EnlaceEvaluacionModal from '@/components/EnlaceEvaluacionModal';
import EncuestaImpacto from '@/components/EncuestaImpacto';
import { DATOS_ENCUESTA_VACIOS, validarEncuesta, type DatosEncuesta, type PasanteAEvaluar } from '@/lib/encuestaImpacto';

export default function EncuestaPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [espacios, setEspacios] = useState<any[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [pasantes, setPasantes] = useState<PasanteAEvaluar[]>([]);
  const [porCoincidencia, setPorCoincidencia] = useState(false);
  const [datosEncuesta, setDatosEncuesta] = useState<DatosEncuesta>(DATOS_ENCUESTA_VACIOS);

  const [formData, setFormData] = useState({ beneficiario_id: '', ciclo_id: '' });
  const [modalEnlace, setModalEnlace] = useState<{ tipo: 'pretest' | 'postest'; beneficiarioId?: number; beneficiarioNombre?: string } | null>(null);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);
  const [conteo, setConteo] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (enviadoExitoso && conteo > 0) {
      timer = setTimeout(() => setConteo(prev => prev - 1), 1000);
    } else if (enviadoExitoso && conteo === 0) {
      router.push('/portal/dashboard');
    }
    return () => clearTimeout(timer);
  }, [enviadoExitoso, conteo, router]);

  const resetFormulario = () => {
    setEnviadoExitoso(false);
    setConteo(5);
    setMessage('');
    setFormData({ beneficiario_id: '', ciclo_id: '' });
    setDatosEncuesta(DATOS_ENCUESTA_VACIOS);
    setPasantes([]);
  };

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
          if (ciclosData.success) {
            setCiclos(ciclosData.data);
            const cicloActual = ciclosData.data.find((c: any) => c.nombre === '2026-2');
            if (cicloActual) setFormData(prev => ({ ...prev, ciclo_id: String(cicloActual.id) }));
          }
        });
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/encuesta'));
  }, [router]);

  useEffect(() => {
    if (!espacioId) {
      setBeneficiarios([]);
      return;
    }
    fetch(`/api/beneficiarios?espacio_id=${espacioId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBeneficiarios(d.data); });
  }, [espacioId]);

  // Solo se califica a los pasantes con los que ese beneficiario realmente trabajó.
  useEffect(() => {
    setDatosEncuesta(prev => ({ ...prev, evaluaciones_pasantes: {} }));
    if (!espacioId || !formData.beneficiario_id) {
      setPasantes([]);
      return;
    }
    fetch(`/api/encuestas/pasantes?espacio_id=${espacioId}&beneficiario_id=${formData.beneficiario_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPasantes(d.data.pasantes);
          setPorCoincidencia(d.data.porCoincidencia);
        }
      });
  }, [espacioId, formData.beneficiario_id]);

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
    const errorEncuesta = validarEncuesta(datosEncuesta, pasantes, { requiereImpacto: true });
    if (errorEncuesta) {
      setMessage(`Error: ${errorEncuesta}`);
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
          ...datosEncuesta,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnviadoExitoso(true);
      setConteo(5);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  if (enviadoExitoso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-md border-t-4 border-yellow-400">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Encuesta Registrada!</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Muchas gracias. Tu opinión sobre la experiencia en el programa ha sido guardada correctamente.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 mb-6">
            Redirigiendo automáticamente al Portal PINE en <span className="font-bold text-sm">{conteo}</span> segundo{conteo !== 1 ? 's' : ''}...
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push('/portal/dashboard')}
              className="w-full py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition shadow-sm"
            >
              Ir al Portal PINE Ahora
            </button>
            <button
              type="button"
              onClick={resetFormulario}
              className="w-full py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition text-sm"
            >
              Registrar Otra Encuesta
            </button>
          </div>
        </div>
      </div>
    );
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
            <p className="text-center text-xs text-gray-500">
              Puede responderla el propio beneficiario (entrégale el dispositivo o usa el QR sin login). Si la llenas tú desde tu cuenta, queda registrado y se avisa a tu supervisor.
            </p>
            <EncuestaImpacto datos={datosEncuesta} onChange={setDatosEncuesta} pasantes={pasantes} porCoincidencia={porCoincidencia} mostrarImpacto />
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
