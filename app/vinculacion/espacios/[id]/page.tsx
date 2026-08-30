'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { mcerQuestions } from '@/lib/questions';

type Tab = 'beneficiarios' | 'mcer' | 'encuesta' | 'asistencia' | 'instructores';

export default function EspacioWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const espacioId = parseInt(params.id as string);

  const [checkingSession, setCheckingSession] = useState(true);
  const [usuario, setUsuario] = useState<{ id: string; nombres: string; rol: string } | null>(null);
  const [tab, setTab] = useState<Tab>('beneficiarios');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const esProfesor = usuario ? ['profesor', 'admin'].includes(usuario.rol) : false;

  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [todosBeneficiarios, setTodosBeneficiarios] = useState<any[]>([]);
  const [selectedBens, setSelectedBens] = useState<number[]>([]);

  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [instructoresActuales, setInstructoresActuales] = useState<any[]>([]);
  const [selectedInstructores, setSelectedInstructores] = useState<number[]>([]);

  const [ciclos, setCiclos] = useState<any[]>([]);

  // MCER
  const [mcerForm, setMcerForm] = useState({ beneficiario_id: '', tipo: 'inicial' });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [mcerFile, setMcerFile] = useState<File | null>(null);

  // Encuesta
  const [encuestaForm, setEncuestaForm] = useState({ beneficiario_id: '', ciclo_id: '', nivel_satisfaccion: 5, comentarios: '' });

  // Asistencia
  const [asistenciaForm, setAsistenciaForm] = useState({ fecha: new Date().toISOString().slice(0, 10), observaciones: '' });
  const [presentes, setPresentes] = useState<number[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin', 'estudiante'].includes(data.usuario.rol)) {
          router.push('/');
          return;
        }
        setUsuario(data.usuario);
        setCheckingSession(false);
        fetchData(data.usuario);
      })
      .catch(() => router.push('/login?redirect=/vinculacion/espacios'));
  }, [router, espacioId]);

  const fetchData = async (usuarioActual: { rol: string }) => {
    try {
      const reqs = [
        fetch(`/api/beneficiarios?espacio_id=${espacioId}`),
        fetch('/api/docencia/ciclos'),
      ];
      if (['profesor', 'admin'].includes(usuarioActual.rol)) {
        reqs.push(fetch('/api/beneficiarios'));
        reqs.push(fetch('/api/estudiantes'));
        reqs.push(fetch(`/api/espacios/instructores?espacio_id=${espacioId}`));
      }
      const results = await Promise.all(reqs);
      const jsons = await Promise.all(results.map(r => r.json()));

      if (jsons[0].success) setBeneficiarios(jsons[0].data);
      if (jsons[1].success) setCiclos(jsons[1].data);
      if (jsons[2]?.success) setTodosBeneficiarios(jsons[2].data);
      if (jsons[3]?.success) setEstudiantes(jsons[3].data);
      if (jsons[4]?.success) setInstructoresActuales(jsons[4].data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAsignarBeneficiarios = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/espacios/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espacio_id: espacioId, beneficiarios_ids: selectedBens }),
      });
      if (!res.ok) throw new Error('Error asignando beneficiarios');
      setMessage('Beneficiarios asignados correctamente');
      setSelectedBens([]);
      fetchData(usuario!);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarInstructores = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/espacios/instructores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espacio_id: espacioId, estudiantes_ids: selectedInstructores }),
      });
      if (!res.ok) throw new Error('Error asignando instructores');
      setMessage('Instructores asignados correctamente');
      setSelectedInstructores([]);
      fetchData(usuario!);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateLevel = (score: number) => {
    if (score <= 5) return 'A1';
    if (score <= 10) return 'A2';
    if (score <= 15) return 'B1';
    return 'B2';
  };

  const handleSubmitMcer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcerForm.beneficiario_id) {
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
      if (mcerFile) {
        const uploadData = new FormData();
        uploadData.append('file', mcerFile);
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
          beneficiario_id: parseInt(mcerForm.beneficiario_id),
          espacio_id: espacioId,
          tipo: mcerForm.tipo,
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
      setMcerFile(null);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEncuesta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encuestaForm.beneficiario_id || !encuestaForm.ciclo_id) {
      setMessage('Error: Selecciona el beneficiario y el ciclo');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/encuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiario_id: parseInt(encuestaForm.beneficiario_id),
          espacio_id: espacioId,
          ciclo_id: parseInt(encuestaForm.ciclo_id),
          nivel_satisfaccion: encuestaForm.nivel_satisfaccion,
          comentarios: encuestaForm.comentarios,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Encuesta registrada exitosamente');
      setEncuestaForm({ beneficiario_id: '', ciclo_id: '', nivel_satisfaccion: 5, comentarios: '' });
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAsistencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (presentes.length === 0) {
      setMessage('Error: Selecciona al menos un beneficiario presente');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/espacios/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          espacio_id: espacioId,
          fecha: asistenciaForm.fecha,
          beneficiarios_presentes: presentes,
          observaciones: asistenciaForm.observaciones,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Asistencia registrada exitosamente');
      setPresentes([]);
      setAsistenciaForm({ ...asistenciaForm, observaciones: '' });
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
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="mb-4">
          <Link href="/vinculacion/espacios" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver a Espacios
          </Link>
        </div>

        {message && <div className="p-4 mb-4 bg-blue-100 text-blue-800 rounded">{message}</div>}

        <div className="flex flex-wrap gap-4 mb-6 border-b">
          <button onClick={() => setTab('beneficiarios')} className={`pb-2 px-2 ${tab === 'beneficiarios' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>Beneficiarios</button>
          <button onClick={() => setTab('mcer')} className={`pb-2 px-2 ${tab === 'mcer' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>Test MCER</button>
          <button onClick={() => setTab('encuesta')} className={`pb-2 px-2 ${tab === 'encuesta' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>Encuesta</button>
          <button onClick={() => setTab('asistencia')} className={`pb-2 px-2 ${tab === 'asistencia' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>Asistencia</button>
          {esProfesor && (
            <button onClick={() => setTab('instructores')} className={`pb-2 px-2 ${tab === 'instructores' ? 'border-b-2 border-blue-600 font-bold' : ''}`}>Instructores</button>
          )}
        </div>

        {tab === 'beneficiarios' && (
          <form onSubmit={handleAsignarBeneficiarios} className="space-y-4">
            <h3 className="font-bold text-lg">Asignar Beneficiarios a este Espacio</h3>
            <div className="border p-4 rounded h-64 overflow-y-auto">
              {(esProfesor ? todosBeneficiarios : beneficiarios).map(b => (
                <label key={b.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100">
                  <input type="checkbox" checked={selectedBens.includes(b.id)} onChange={(e) => {
                    if (e.target.checked) setSelectedBens([...selectedBens, b.id]);
                    else setSelectedBens(selectedBens.filter(id => id !== b.id));
                  }} />
                  <span>{b.nombres} {b.apellidos}</span>
                </label>
              ))}
            </div>
            <button disabled={loading || selectedBens.length === 0} className="w-full bg-blue-600 text-white p-2 rounded">Inscribir Seleccionados</button>

            <h4 className="font-semibold mt-6">Ya inscritos ({beneficiarios.length})</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {beneficiarios.map(b => <li key={b.id}>{b.nombres} {b.apellidos}</li>)}
            </ul>
          </form>
        )}

        {tab === 'mcer' && (
          <form onSubmit={handleSubmitMcer} className="space-y-6">
            <h3 className="font-bold text-lg">Test de Nivelación MCER</h3>
            <a href="/api/tests/download-docx" target="_blank" className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
              📄 Descargar Test en Word
            </a>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-blue-900">Beneficiario</label>
                <select required className="mt-1 w-full border p-2 rounded" value={mcerForm.beneficiario_id} onChange={e => setMcerForm({ ...mcerForm, beneficiario_id: e.target.value })}>
                  <option value="">Seleccione...</option>
                  {beneficiarios.map(b => <option key={b.id} value={b.id}>{b.nombres} {b.apellidos}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-blue-900">Momento del Test</label>
                <select className="mt-1 w-full border p-2 rounded" value={mcerForm.tipo} onChange={e => setMcerForm({ ...mcerForm, tipo: e.target.value })}>
                  <option value="inicial">Pre-Test (Inicial)</option>
                  <option value="final">Post-Test (Final)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-blue-900">Foto / Evidencia Física</label>
                <input type="file" accept="image/*" onChange={e => setMcerFile(e.target.files?.[0] ?? null)} className="mt-1 w-full text-sm" />
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto border rounded p-4">
              {mcerQuestions.map((q, index) => (
                <div key={q.id} className="p-3 border rounded">
                  <p className="font-medium text-gray-900 mb-2">
                    <span className="text-blue-600 mr-2">{index + 1}.</span> {q.text}
                    <span className="text-xs text-gray-400 ml-2">({q.level})</span>
                  </p>
                  <div className="space-y-1 pl-4">
                    {Object.entries(q.options).map(([key, value]) => (
                      <label key={key} className="flex items-center space-x-2 cursor-pointer text-sm">
                        <input type="radio" name={`question_${q.id}`} value={key} onChange={() => setAnswers({ ...answers, [q.id]: key })} checked={answers[q.id] === key} required />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded font-medium">Enviar y Evaluar</button>
          </form>
        )}

        {tab === 'encuesta' && (
          <form onSubmit={handleSubmitEncuesta} className="space-y-6">
            <h3 className="font-bold text-lg">Encuesta de Satisfacción</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700">Beneficiario</label>
                <select required className="mt-1 w-full border p-2 rounded" value={encuestaForm.beneficiario_id} onChange={e => setEncuestaForm({ ...encuestaForm, beneficiario_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {beneficiarios.map(b => <option key={b.id} value={b.id}>{b.nombres} {b.apellidos}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700">Ciclo / Semestre</label>
                <select required className="mt-1 w-full border p-2 rounded" value={encuestaForm.ciclo_id} onChange={e => setEncuestaForm({ ...encuestaForm, ciclo_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setEncuestaForm({ ...encuestaForm, nivel_satisfaccion: star })}
                  className={`text-3xl ${star <= encuestaForm.nivel_satisfaccion ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
              ))}
            </div>
            <textarea rows={3} placeholder="Comentarios (opcional)" className="w-full border p-2 rounded" value={encuestaForm.comentarios} onChange={e => setEncuestaForm({ ...encuestaForm, comentarios: e.target.value })} />
            <button disabled={loading} className="w-full bg-yellow-500 text-white p-3 rounded font-medium">Enviar Encuesta</button>
          </form>
        )}

        {tab === 'asistencia' && (
          <form onSubmit={handleSubmitAsistencia} className="space-y-4">
            <h3 className="font-bold text-lg">Registrar Asistencia</h3>
            <input type="date" required className="w-full border p-2 rounded" value={asistenciaForm.fecha} onChange={e => setAsistenciaForm({ ...asistenciaForm, fecha: e.target.value })} />
            <div className="border p-4 rounded h-56 overflow-y-auto">
              <p className="font-semibold mb-2 text-sm">Beneficiarios presentes:</p>
              {beneficiarios.map(b => (
                <label key={b.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100">
                  <input type="checkbox" checked={presentes.includes(b.id)} onChange={(e) => {
                    if (e.target.checked) setPresentes([...presentes, b.id]);
                    else setPresentes(presentes.filter(id => id !== b.id));
                  }} />
                  <span>{b.nombres} {b.apellidos}</span>
                </label>
              ))}
            </div>
            <textarea rows={2} placeholder="Observaciones (opcional)" className="w-full border p-2 rounded" value={asistenciaForm.observaciones} onChange={e => setAsistenciaForm({ ...asistenciaForm, observaciones: e.target.value })} />
            <button disabled={loading || presentes.length === 0} className="w-full bg-blue-600 text-white p-2 rounded">Guardar Asistencia</button>
          </form>
        )}

        {tab === 'instructores' && esProfesor && (
          <form onSubmit={handleAsignarInstructores} className="space-y-4">
            <h3 className="font-bold text-lg">Asignar Estudiantes Instructores</h3>
            <div className="border p-4 rounded h-64 overflow-y-auto">
              {estudiantes.map(s => (
                <label key={s.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100">
                  <input type="checkbox" checked={selectedInstructores.includes(s.id)} onChange={(e) => {
                    if (e.target.checked) setSelectedInstructores([...selectedInstructores, s.id]);
                    else setSelectedInstructores(selectedInstructores.filter(id => id !== s.id));
                  }} />
                  <span>{s.nombres} {s.apellidos}</span>
                </label>
              ))}
            </div>
            <button disabled={loading || selectedInstructores.length === 0} className="w-full bg-blue-600 text-white p-2 rounded">Asignar Seleccionados</button>

            <h4 className="font-semibold mt-6">Instructores actuales</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {instructoresActuales.map(i => <li key={i.id}>{i.nombres} {i.apellidos}</li>)}
              {instructoresActuales.length === 0 && <li className="text-gray-400">Ninguno todavía</li>}
            </ul>
          </form>
        )}
      </div>
    </div>
  );
}
