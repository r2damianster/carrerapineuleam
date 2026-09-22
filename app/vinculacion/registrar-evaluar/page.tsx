'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mcerQuestions, preguntasCalificables, calcularResultadoMcer } from '@/lib/questions';
import EnlaceEvaluacionModal from '@/components/EnlaceEvaluacionModal';
import AudioQuestionRecorder, { ResultadoAudioMcer } from '@/components/AudioQuestionRecorder';

const preguntasPuntaje = preguntasCalificables();
const preguntasAudio = mcerQuestions.filter(q => q.type === 'audio');

export default function RegistrarEvaluarPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [modo, setModo] = useState<'asignar' | 'nuevo'>('nuevo');

  const [espacios, setEspacios] = useState<any[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [todosBeneficiarios, setTodosBeneficiarios] = useState<any[]>([]);
  const [selectedBens, setSelectedBens] = useState<number[]>([]);
  const [modalEnlace, setModalEnlace] = useState(false);

  const [nuevoForm, setNuevoForm] = useState({
    nombres: '', apellidos: '', contacto: '', email: '',
    edad: '', tiene_discapacidad: false, tipo_discapacidad: '',
    situacion_ocupacional: '', rol_laboral: '', nivel_educativo: '', carrera: '', curso: '',
  });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [audioResultado, setAudioResultado] = useState<ResultadoAudioMcer | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);
  const [conteo, setConteo] = useState(6);
  const [resultadoResumen, setResultadoResumen] = useState<{ nombre: string; score: number; level: string } | null>(null);

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
    setConteo(6);
    setResultadoResumen(null);
    setMessage('');
    setNuevoForm({
      nombres: '', apellidos: '', contacto: '', email: '',
      edad: '', tiene_discapacidad: false, tipo_discapacidad: '',
      situacion_ocupacional: '', rol_laboral: '', nivel_educativo: '', carrera: '', curso: '',
    });
    setAnswers({});
    setAudioResultado(null);
    setFile(null);
  };

  const trabaja = ['estudia_trabaja', 'solo_trabaja'].includes(nuevoForm.situacion_ocupacional);
  const estudia = ['solo_estudia', 'estudia_trabaja'].includes(nuevoForm.situacion_ocupacional);

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
      .catch(() => router.push('/portal/login?redirect=/vinculacion/registrar-evaluar'));
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
    if (Object.keys(answers).length < preguntasPuntaje.length) {
      setMessage('Error: El Pre-Test es obligatorio — responde todas las preguntas');
      return;
    }
    if (preguntasAudio.length > 0 && !audioResultado) {
      setMessage('Error: Debes grabar y evaluar la respuesta oral');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      let evidencia_url = '';
      if (file) {
        const uploadData = new FormData();
        uploadData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.error || 'Error subiendo la evidencia');
        evidencia_url = uploadJson.url;
      }

      const resultado = calcularResultadoMcer(answers, audioResultado?.score ?? null);

      const res = await fetch('/api/beneficiarios/registrar-y-evaluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoForm,
          espacio_id: parseInt(espacioId),
          respuestas_json: { ...answers, _audio: audioResultado, _desglose: resultado.desglose },
          puntaje_obtenido: resultado.score,
          nivel_asignado: resultado.level,
          evidencia_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResultadoResumen({
        nombre: `${data.data.nombres} ${data.data.apellidos}`,
        score: resultado.score,
        level: resultado.level,
      });
      setEnviadoExitoso(true);
      setConteo(6);
      fetch(`/api/beneficiarios?espacio_id=${espacioId}`).then(r => r.json()).then(d => { if (d.success) setInscritos(d.data); });
      window.scrollTo(0, 0);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  if (enviadoExitoso && resultadoResumen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-lg w-full text-center bg-white p-8 rounded-xl shadow-md border-t-4 border-uleam-blue">
          <div className="w-16 h-16 bg-blue-100 text-uleam-blue rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Beneficiario Registrado y Evaluado!</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between items-center text-sm py-1 border-b border-blue-100">
              <span className="text-gray-600">Beneficiario:</span>
              <span className="font-bold text-gray-900">{resultadoResumen.nombre}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-blue-100">
              <span className="text-gray-600">Puntaje Pre-Test:</span>
              <span className="font-bold text-blue-900">{resultadoResumen.score} / 100</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-gray-600">Nivel Asignado:</span>
              <span className="font-bold text-uleam-blue">{resultadoResumen.level}</span>
            </div>
          </div>

          <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 mb-6">
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
              Registrar Otro Beneficiario
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h2 className="text-3xl font-bold text-center text-uleam-blue mb-2">Registrar y Evaluar Beneficiario</h2>
        <p className="text-center text-gray-600 mb-6">Todo beneficiario nuevo se registra junto con su Pre-Test MCER — no queda registrado sin evaluación.</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Espacio</label>
          <select required value={espacioId} onChange={e => setEspacioId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue mb-4">
            <option value="">Selecciona tu espacio...</option>
            {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 justify-center">
          <button type="button" disabled={!espacioId} onClick={() => setModalEnlace(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-uleam-blue hover:bg-uleam-blue/90 disabled:opacity-50">
            🔗 QR Auto-registro + Pre-Test (sin login)
          </button>
          <a href="/api/tests/download-docx?tipo=pretest" target="_blank" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
            📄 Descargar Pre-Test en Word
          </a>
        </div>
        <p className="text-xs text-gray-500 text-center -mt-4 mb-6">El QR deja que cada beneficiario se registre y tome el Pre-Test él mismo desde su celular, sin que tengas que hacerlo aquí uno por uno.</p>

        {modalEnlace && espacioId && (
          <EnlaceEvaluacionModal
            espacioId={espacioId}
            testTipo="mcer"
            tipo="pretest"
            onClose={() => setModalEnlace(false)}
          />
        )}

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <div className="flex gap-4 mb-6 border-b">
          <button type="button" onClick={() => setModo('nuevo')} className={`pb-2 px-2 ${modo === 'nuevo' ? 'border-b-2 border-uleam-blue font-bold text-uleam-blue' : 'text-gray-500'}`}>Registrar nuevo + Pre-Test</button>
          <button type="button" onClick={() => setModo('asignar')} className={`pb-2 px-2 ${modo === 'asignar' ? 'border-b-2 border-uleam-blue font-bold text-uleam-blue' : 'text-gray-500'}`}>Asignar beneficiario existente</button>
        </div>

        {modo === 'asignar' && (
          <form onSubmit={handleAsignar} className="space-y-4">
            <p className="text-xs text-gray-500">Para alguien que ya es beneficiario en otro espacio/ciclo — ya tiene su Pre-Test, solo se le suma a este espacio.</p>
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
          <form onSubmit={handleNuevo} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-uleam-blue">1. Datos del Beneficiario</h3>
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Nombres" value={nuevoForm.nombres} onChange={e => setNuevoForm({ ...nuevoForm, nombres: e.target.value })} className="px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                <input required placeholder="Apellidos" value={nuevoForm.apellidos} onChange={e => setNuevoForm({ ...nuevoForm, apellidos: e.target.value })} className="px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              </div>
              <input placeholder="Contacto (teléfono)" value={nuevoForm.contacto} onChange={e => setNuevoForm({ ...nuevoForm, contacto: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              <input type="email" placeholder="Email (opcional)" value={nuevoForm.email} onChange={e => setNuevoForm({ ...nuevoForm, email: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />

              <input type="number" min="0" placeholder="Edad" value={nuevoForm.edad} onChange={e => setNuevoForm({ ...nuevoForm, edad: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />

              <label className="flex items-center gap-3 px-1 cursor-pointer">
                <input type="checkbox" checked={nuevoForm.tiene_discapacidad} onChange={e => setNuevoForm({ ...nuevoForm, tiene_discapacidad: e.target.checked, tipo_discapacidad: e.target.checked ? nuevoForm.tipo_discapacidad : '' })} className="w-5 h-5 accent-uleam-blue" />
                <span className="text-gray-700">Tiene discapacidad</span>
              </label>
              {nuevoForm.tiene_discapacidad && (
                <input placeholder="¿Cuál?" value={nuevoForm.tipo_discapacidad} onChange={e => setNuevoForm({ ...nuevoForm, tipo_discapacidad: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Situación ocupacional</label>
                <select
                  value={nuevoForm.situacion_ocupacional}
                  onChange={e => setNuevoForm({ ...nuevoForm, situacion_ocupacional: e.target.value, rol_laboral: '', nivel_educativo: '', carrera: '', curso: '' })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue"
                >
                  <option value="">Selecciona...</option>
                  <option value="solo_estudia">Solo estudia</option>
                  <option value="estudia_trabaja">Estudia y trabaja</option>
                  <option value="solo_trabaja">Solo trabaja</option>
                  <option value="desempleado_no_estudia">Desempleado y no estudia</option>
                </select>
              </div>

              {trabaja && (
                <input placeholder="Rol que ejerce" value={nuevoForm.rol_laboral} onChange={e => setNuevoForm({ ...nuevoForm, rol_laboral: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              )}

              {estudia && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nivel educativo</label>
                  <select
                    value={nuevoForm.nivel_educativo}
                    onChange={e => setNuevoForm({ ...nuevoForm, nivel_educativo: e.target.value, carrera: '', curso: '' })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue"
                  >
                    <option value="">Selecciona...</option>
                    <option value="universidad">Universidad</option>
                    <option value="colegio">Colegio</option>
                    <option value="escuela">Escuela</option>
                  </select>
                </div>
              )}

              {estudia && nuevoForm.nivel_educativo === 'universidad' && (
                <>
                  <input placeholder="Carrera (ej. Carrera PINE, u otra)" value={nuevoForm.carrera} onChange={e => setNuevoForm({ ...nuevoForm, carrera: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                  <input placeholder="Curso/semestre" value={nuevoForm.curso} onChange={e => setNuevoForm({ ...nuevoForm, curso: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                </>
              )}
              <p className="text-xs text-gray-500">El beneficiario no inicia sesión en el sistema — este registro es solo para llevar sus datos y evaluarlo.</p>
            </div>

            <div className="space-y-6 pt-6 border-t">
              <h3 className="text-xl font-bold text-uleam-blue">2. Pre-Test MCER (obligatorio)</h3>
              {mcerQuestions.map((q, index) => (
                <div key={q.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  {q.passage && (
                    <p className="mb-3 p-3 bg-gray-50 border-l-4 border-blue-200 text-sm text-gray-600 italic">{q.passage}</p>
                  )}
                  <p className="font-medium text-gray-900 mb-3">
                    <span className="text-blue-600 mr-2">{index + 1}.</span> {q.text}
                    <span className="text-xs text-gray-400 ml-2">({q.level})</span>
                  </p>
                  {q.type === 'audio' ? (
                    <AudioQuestionRecorder consigna={q.text} maxSeconds={q.audioMaxSeconds ?? 30} onResult={setAudioResultado} />
                  ) : (
                    <div className="space-y-2 pl-6">
                      {q.options && Object.entries(q.options).map(([key, value]) => (
                        <label key={key} className="flex items-center space-x-3 cursor-pointer">
                          <input type="radio" name={`question_${q.id}`} value={key}
                            onChange={() => setAnswers({ ...answers, [q.id]: key })}
                            checked={answers[q.id] === key}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            required
                          />
                          <span className="text-gray-700">{value}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Foto / Evidencia Física (opcional)</label>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-500" />
              </div>
            </div>

            <div className="pt-4 border-t">
              <button type="submit" disabled={loading} className="w-full md:w-auto md:px-12 mx-auto flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Registrando y calculando...' : 'Registrar y Evaluar Beneficiario'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
