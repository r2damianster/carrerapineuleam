'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { mcerQuestions } from '@/lib/questions';
import StarRating from '@/components/StarRating';

type EnlaceInfo = {
  tipo: 'pretest' | 'postest';
  test_tipo: 'mcer' | 'encuesta';
  espacio_nombre: string;
  beneficiario_nombre: string | null;
  instructores: { id: number; nombre: string }[];
};

function calculateLevel(score: number) {
  if (score <= 5) return 'A1';
  if (score <= 10) return 'A2';
  if (score <= 15) return 'B1';
  return 'B2';
}

export default function EnlacePublicoPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [enlace, setEnlace] = useState<EnlaceInfo | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const [yaRegistrado, setYaRegistrado] = useState(false);
  const [emailExistente, setEmailExistente] = useState('');

  const [datosForm, setDatosForm] = useState({
    nombres: '', apellidos: '', contacto: '', email: '',
    edad: '', tiene_discapacidad: false, tipo_discapacidad: '',
    situacion_ocupacional: '', rol_laboral: '', nivel_educativo: '', carrera: '', curso: '',
  });
  const trabaja = ['estudia_trabaja', 'solo_trabaja'].includes(datosForm.situacion_ocupacional);
  const estudia = ['solo_estudia', 'estudia_trabaja'].includes(datosForm.situacion_ocupacional);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [nivelSatisfaccion, setNivelSatisfaccion] = useState(5);
  const [aprendizaje, setAprendizaje] = useState(5);
  const [mejora, setMejora] = useState(5);
  const [recursos, setRecursos] = useState(5);
  const [comentarios, setComentarios] = useState('');
  const [calificacionesInstructores, setCalificacionesInstructores] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch(`/api/enlaces/${token}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setEnlace(data.data);
        if (data.data.instructores?.length) {
          setCalificacionesInstructores(Object.fromEntries(data.data.instructores.map((i: any) => [i.id, 5])));
        }
      })
      .catch(err => setErrorCarga(err.message || 'Este enlace ya no está disponible'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enlace) return;

    if (enlace.tipo === 'pretest') {
      if (yaRegistrado && !emailExistente) {
        setMensaje('Error: Escribe el correo con el que te registraste');
        return;
      }
      if (!yaRegistrado && (!datosForm.nombres || !datosForm.apellidos)) {
        setMensaje('Error: Escribe tus nombres y apellidos');
        return;
      }
    }
    if (enlace.test_tipo === 'mcer' && Object.keys(answers).length < mcerQuestions.length) {
      setMensaje('Error: Debes responder todas las preguntas');
      return;
    }

    setEnviando(true);
    setMensaje('');
    try {
      let payload: Record<string, any> = {};
      if (enlace.tipo === 'pretest') {
        payload = yaRegistrado ? { ya_registrado: true, email: emailExistente } : { ...datosForm };
      }

      if (enlace.test_tipo === 'mcer') {
        let score = 0;
        mcerQuestions.forEach(q => { if (answers[q.id] === q.correct) score += 1; });
        payload.respuestas_json = answers;
        payload.puntaje_obtenido = score;
        payload.nivel_asignado = calculateLevel(score);
      } else {
        payload.nivel_satisfaccion = nivelSatisfaccion;
        payload.aprendizaje = aprendizaje;
        payload.mejora = mejora;
        payload.recursos = recursos;
        payload.comentarios = comentarios;
        payload.calificaciones_instructores = calificacionesInstructores;
      }

      const res = await fetch(`/api/enlaces/${token}/${enlace.tipo === 'pretest' ? 'pretest' : 'postest'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnviado(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
      window.scrollTo(0, 0);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }

  if (errorCarga || !enlace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-red-700 mb-2">Enlace no disponible</h2>
          <p className="text-gray-600">{errorCarga || 'Este enlace ya no está disponible.'}</p>
          <p className="text-sm text-gray-400 mt-4">Pide un enlace nuevo a tu instructor.</p>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-md border-t-4 border-green-500">
          <h2 className="text-xl font-bold text-green-700 mb-2">¡Listo!</h2>
          <p className="text-gray-600">
            {enlace.test_tipo === 'mcer' ? 'Tu test fue registrado.' : 'Tu encuesta fue registrada.'} Gracias por participar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-3xl font-bold text-center text-uleam-blue mb-1">
          {enlace.test_tipo === 'mcer' ? 'Test de Nivelación MCER' : 'Encuesta de Satisfacción'}
        </h2>
        <p className="text-center text-gray-600 mb-8">
          {enlace.espacio_nombre}
          {enlace.beneficiario_nombre ? ` · ${enlace.beneficiario_nombre}` : ''}
        </p>

        {mensaje && (
          <div className={`p-4 mb-6 rounded-md ${mensaje.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {mensaje}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {enlace.tipo === 'pretest' && (
            <div className="space-y-4 bg-blue-50 p-6 rounded-lg border border-blue-100">
              <div className="flex gap-2 justify-center">
                <button type="button" onClick={() => setYaRegistrado(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${!yaRegistrado ? 'bg-uleam-blue text-white' : 'bg-white text-uleam-blue border border-uleam-blue'}`}>
                  Soy nuevo
                </button>
                <button type="button" onClick={() => setYaRegistrado(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${yaRegistrado ? 'bg-uleam-blue text-white' : 'bg-white text-uleam-blue border border-uleam-blue'}`}>
                  Ya estoy registrado
                </button>
              </div>

              {yaRegistrado ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correo con el que te registraste</label>
                  <input type="email" required placeholder="tu@correo.com" value={emailExistente} onChange={e => setEmailExistente(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-uleam-blue">Tus datos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required placeholder="Nombres" value={datosForm.nombres} onChange={e => setDatosForm({ ...datosForm, nombres: e.target.value })} className="px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                    <input required placeholder="Apellidos" value={datosForm.apellidos} onChange={e => setDatosForm({ ...datosForm, apellidos: e.target.value })} className="px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                  </div>
                  <input placeholder="Contacto (teléfono)" value={datosForm.contacto} onChange={e => setDatosForm({ ...datosForm, contacto: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                  <input type="email" placeholder="Email (opcional)" value={datosForm.email} onChange={e => setDatosForm({ ...datosForm, email: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                  <input type="number" min="0" placeholder="Edad" value={datosForm.edad} onChange={e => setDatosForm({ ...datosForm, edad: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />

                  <label className="flex items-center gap-3 px-1 cursor-pointer">
                    <input type="checkbox" checked={datosForm.tiene_discapacidad} onChange={e => setDatosForm({ ...datosForm, tiene_discapacidad: e.target.checked, tipo_discapacidad: e.target.checked ? datosForm.tipo_discapacidad : '' })} className="w-5 h-5 accent-uleam-blue" />
                    <span className="text-gray-700">Tengo una discapacidad</span>
                  </label>
                  {datosForm.tiene_discapacidad && (
                    <input placeholder="¿Cuál?" value={datosForm.tipo_discapacidad} onChange={e => setDatosForm({ ...datosForm, tipo_discapacidad: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Situación ocupacional</label>
                    <select
                      value={datosForm.situacion_ocupacional}
                      onChange={e => setDatosForm({ ...datosForm, situacion_ocupacional: e.target.value, rol_laboral: '', nivel_educativo: '', carrera: '', curso: '' })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue"
                    >
                      <option value="">Selecciona...</option>
                      <option value="solo_estudia">Solo estudio</option>
                      <option value="estudia_trabaja">Estudio y trabajo</option>
                      <option value="solo_trabaja">Solo trabajo</option>
                      <option value="desempleado_no_estudia">Desempleado y no estudio</option>
                    </select>
                  </div>

                  {trabaja && (
                    <input placeholder="Rol que ejerces" value={datosForm.rol_laboral} onChange={e => setDatosForm({ ...datosForm, rol_laboral: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                  )}

                  {estudia && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nivel educativo</label>
                      <select
                        value={datosForm.nivel_educativo}
                        onChange={e => setDatosForm({ ...datosForm, nivel_educativo: e.target.value, carrera: '', curso: '' })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue"
                      >
                        <option value="">Selecciona...</option>
                        <option value="universidad">Universidad</option>
                        <option value="colegio">Colegio</option>
                        <option value="escuela">Escuela</option>
                      </select>
                    </div>
                  )}

                  {estudia && datosForm.nivel_educativo === 'universidad' && (
                    <>
                      <input placeholder="Carrera" value={datosForm.carrera} onChange={e => setDatosForm({ ...datosForm, carrera: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                      <input placeholder="Curso/semestre" value={datosForm.curso} onChange={e => setDatosForm({ ...datosForm, curso: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {enlace.test_tipo === 'mcer' ? (
            <div className="space-y-6">
              {mcerQuestions.map((q, index) => (
                <div key={q.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <p className="font-medium text-gray-900 mb-3">
                    <span className="text-blue-600 mr-2">{index + 1}.</span> {q.text}
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
          ) : (
            <div className="pt-2 space-y-6">
              <StarRating label="¿Qué tan satisfecho estás con el programa?" value={nivelSatisfaccion} onChange={setNivelSatisfaccion} />
              <StarRating label="¿Sientes que aprendiste?" value={aprendizaje} onChange={setAprendizaje} />
              <StarRating label="¿Sientes que mejoraste tu nivel de inglés?" value={mejora} onChange={setMejora} />
              <StarRating label="¿Cómo calificarías los recursos/materiales usados?" value={recursos} onChange={setRecursos} />
              {enlace.instructores.length > 0 && (
                <div className="pt-4 border-t space-y-6">
                  <p className="text-center text-sm font-semibold text-gray-600">Calificación por instructor</p>
                  {enlace.instructores.map(i => (
                    <StarRating key={i.id} label={`¿Cómo calificarías a ${i.nombre}?`}
                      value={calificacionesInstructores[i.id] ?? 5}
                      onChange={v => setCalificacionesInstructores({ ...calificacionesInstructores, [i.id]: v })} />
                  ))}
                </div>
              )}
              <div className="pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Comentarios adicionales (Opcional)</label>
                <textarea rows={4} value={comentarios} onChange={e => setComentarios(e.target.value)}
                  placeholder="¿Qué te gustó más? ¿Qué podemos mejorar?"
                  className="block w-full rounded-md border-gray-300 shadow-sm p-3 border"
                ></textarea>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <button type="submit" disabled={enviando} className="w-full md:w-auto md:px-12 mx-auto flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-uleam-blue hover:bg-uleam-blue/90 disabled:opacity-50">
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
