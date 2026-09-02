'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mcerQuestions } from '@/lib/questions';
import EnlaceEvaluacionModal from '@/components/EnlaceEvaluacionModal';

export default function TestMcerPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [espacios, setEspacios] = useState<any[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);

  const [form, setForm] = useState({ beneficiario_id: '', tipo: 'inicial' });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [file, setFile] = useState<File | null>(null);
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
        return fetch('/api/espacios?area=vinculacion').then(r => r.json()).then(d => {
          if (d.success) {
            setEspacios(d.data);
            if (d.data.length === 1) setEspacioId(String(d.data[0].id));
          }
        });
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/test-mcer'));
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

  const calculateLevel = (score: number) => {
    if (score <= 5) return 'A1';
    if (score <= 10) return 'A2';
    if (score <= 15) return 'B1';
    return 'B2';
  };

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
    if (Object.keys(answers).length < mcerQuestions.length) {
      setMessage('Error: Debes responder todas las preguntas');
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

      let score = 0;
      mcerQuestions.forEach(q => { if (answers[q.id] === q.correct) score += 1; });
      const level = calculateLevel(score);

      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiario_id: parseInt(form.beneficiario_id),
          espacio_id: parseInt(espacioId),
          tipo: form.tipo,
          puntaje_obtenido: score,
          nivel_asignado: level,
          respuestas_json: answers,
          evidencia_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`¡Test registrado! Puntaje: ${score}/20. Nivel asignado: ${level}`);
      setAnswers({});
      setFile(null);
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
          </div>

          <div className="space-y-6">
            {mcerQuestions.map((q, index) => (
              <div key={q.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <p className="font-medium text-gray-900 mb-3">
                  <span className="text-blue-600 mr-2">{index + 1}.</span> {q.text}
                  <span className="text-xs text-gray-400 ml-2">({q.level})</span>
                </p>
                <div className="space-y-2 pl-6">
                  {Object.entries(q.options).map(([key, value]) => (
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
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <button type="submit" disabled={loading} className="w-full md:w-auto md:px-12 mx-auto flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Calculando Resultados...' : 'Enviar y Evaluar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
