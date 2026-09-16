'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mcerQuestions, preguntasCalificables, calcularResultadoMcer } from '@/lib/questions';
import EnlaceEvaluacionModal from '@/components/EnlaceEvaluacionModal';
import AudioQuestionRecorder, { ResultadoAudioMcer } from '@/components/AudioQuestionRecorder';
import StarRating from '@/components/StarRating';

const preguntasPuntaje = preguntasCalificables();
const preguntasAudio = mcerQuestions.filter(q => q.type === 'audio');

export default function TestMcerPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [espacios, setEspacios] = useState<any[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [instructores, setInstructores] = useState<any[]>([]);

  const [form, setForm] = useState({ beneficiario_id: '', tipo: 'inicial', ciclo_id: '' });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [audioResultado, setAudioResultado] = useState<ResultadoAudioMcer | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [modalEnlace, setModalEnlace] = useState<{ tipo: 'pretest' | 'postest'; beneficiarioId?: number; beneficiarioNombre?: string } | null>(null);

  // El postest (Post-Test/Final) siempre trae la encuesta de satisfacción obligatoria en el mismo envío.
  const esPostest = form.tipo === 'final';
  const [nivelSatisfaccion, setNivelSatisfaccion] = useState(5);
  const [aprendizaje, setAprendizaje] = useState(5);
  const [mejora, setMejora] = useState(5);
  const [recursos, setRecursos] = useState(5);
  const [comentarios, setComentarios] = useState('');
  const [calificacionesInstructores, setCalificacionesInstructores] = useState<Record<number, number>>({});

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
            if (cicloActual) setForm(prev => ({ ...prev, ciclo_id: String(cicloActual.id) }));
          }
        });
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/test-mcer'));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espacioId) {
      setMessage('Error: Selecciona un espacio');
      return;
    }
    if (!form.beneficiario_id) {
      setMessage('Error: Selecciona un beneficiario');
      return;
    }
    if (Object.keys(answers).length < preguntasPuntaje.length) {
      setMessage('Error: Debes responder todas las preguntas');
      return;
    }
    if (preguntasAudio.length > 0 && !audioResultado) {
      setMessage('Error: Debes grabar y evaluar la respuesta oral');
      return;
    }
    if (esPostest && !form.ciclo_id) {
      setMessage('Error: El post-test incluye la encuesta de satisfacción — selecciona el ciclo académico a evaluar');
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

      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiario_id: parseInt(form.beneficiario_id),
          espacio_id: parseInt(espacioId),
          tipo: form.tipo,
          puntaje_obtenido: resultado.score,
          nivel_asignado: resultado.level,
          respuestas_json: { ...answers, _audio: audioResultado, _desglose: resultado.desglose },
          evidencia_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const d = resultado.desglose;
      const fmt = (v: number | null) => v === null ? '—' : Math.round(v);
      let mensajeFinal =
        `¡Test registrado! Puntaje final: ${resultado.score}/100 ` +
        `(Gramática: ${fmt(d.grammar)}%, Lectura: ${fmt(d.reading)}%, Oral: ${fmt(d.speaking)}%). ` +
        `Nivel asignado: ${resultado.level}`;

      if (esPostest) {
        const resEncuesta = await fetch('/api/encuestas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beneficiario_id: parseInt(form.beneficiario_id),
            espacio_id: parseInt(espacioId),
            ciclo_id: parseInt(form.ciclo_id),
            nivel_satisfaccion: nivelSatisfaccion,
            aprendizaje,
            mejora,
            recursos,
            comentarios,
            calificaciones_instructores: calificacionesInstructores,
          }),
        });
        const dataEncuesta = await resEncuesta.json();
        if (!resEncuesta.ok) {
          mensajeFinal += ` — Atención: el test se guardó pero la encuesta falló (${dataEncuesta.error}). Vuelve a enviarla desde /vinculacion/encuesta.`;
        } else {
          mensajeFinal += ' Encuesta de satisfacción también registrada.';
        }
      }

      setMessage(mensajeFinal);
      setAnswers({});
      setAudioResultado(null);
      setFile(null);
      setNivelSatisfaccion(5);
      setAprendizaje(5);
      setMejora(5);
      setRecursos(5);
      setComentarios('');
      setCalificacionesInstructores(Object.fromEntries(instructores.map(i => [i.id, 5])));
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-2">Test de Nivelación MCER</h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-8">
          <p className="text-gray-600">Aplicado por estudiantes a beneficiarios del programa</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button type="button" disabled={!espacioId} onClick={() => setModalEnlace({ tipo: 'pretest' })}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-uleam-blue hover:bg-uleam-blue/90 disabled:opacity-50">
              🔗 QR Pre-Test (sin login)
            </button>
            <button type="button" disabled={!form.beneficiario_id}
              onClick={() => setModalEnlace({
                tipo: 'postest',
                beneficiarioId: parseInt(form.beneficiario_id),
                beneficiarioNombre: beneficiarios.find(b => String(b.id) === form.beneficiario_id) ? `${beneficiarios.find(b => String(b.id) === form.beneficiario_id).nombres} ${beneficiarios.find(b => String(b.id) === form.beneficiario_id).apellidos}` : undefined,
              })}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-uleam-blue hover:bg-uleam-blue/90 disabled:opacity-50">
              🔗 QR Post-Test (sin login)
            </button>
            <a href="/api/tests/download-docx" target="_blank" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
              📄 Descargar Test en Word
            </a>
          </div>
        </div>

        {modalEnlace && espacioId && (
          <EnlaceEvaluacionModal
            espacioId={espacioId}
            testTipo="mcer"
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

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-bold text-blue-900">Espacio</label>
              <select required value={espacioId} onChange={e => setEspacioId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="">Selecciona...</option>
                {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-blue-900">Beneficiario Evaluado</label>
              <select required value={form.beneficiario_id} onChange={e => setForm({ ...form, beneficiario_id: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="">Seleccione...</option>
                {beneficiarios.map(b => <option key={b.id} value={b.id}>{b.nombres} {b.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-blue-900">Momento del Test</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="inicial">Pre-Test (Inicial)</option>
                <option value="final">Post-Test (Final)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-blue-900">Foto / Evidencia Física</label>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm text-gray-500" />
            </div>
            {esPostest && (
              <div>
                <label className="block text-sm font-bold text-blue-900">Ciclo a evaluar (Encuesta)</label>
                <select required value={form.ciclo_id} onChange={e => setForm({ ...form, ciclo_id: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                  <option value="">Selecciona...</option>
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-6">
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
          </div>

          {esPostest && (
            <div className="pt-6 border-t space-y-6">
              <h3 className="text-xl font-bold text-center text-uleam-blue">Encuesta de Satisfacción (obligatoria en Post-Test)</h3>
              <StarRating label="¿Qué tan satisfecho está el beneficiario con el programa?" value={nivelSatisfaccion} onChange={setNivelSatisfaccion} />
              <StarRating label="¿Sintió que aprendió?" value={aprendizaje} onChange={setAprendizaje} />
              <StarRating label="¿Sintió que mejoró su nivel de inglés?" value={mejora} onChange={setMejora} />
              <StarRating label="¿Cómo calificaría los recursos/materiales usados?" value={recursos} onChange={setRecursos} />
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
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Comentarios adicionales (Opcional)</label>
                <textarea rows={4} value={comentarios} onChange={e => setComentarios(e.target.value)}
                  placeholder="¿Qué le gustó más? ¿Qué podemos mejorar?"
                  className="block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                ></textarea>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <button type="submit" disabled={loading} className="w-full md:w-auto md:px-12 mx-auto flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Calculando Resultados...' : esPostest ? 'Enviar Test + Encuesta' : 'Enviar y Evaluar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
