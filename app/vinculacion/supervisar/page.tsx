'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { puedeSupervisarVinculacion } from '@/lib/modulos';

interface Instructor {
  id: number;
  nombre: string;
}

interface Registro {
  id: number;
  espacio_id: number;
  espacio_nombre: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  observaciones: string | null;
  foto_url: string | null;
  estado_aprobacion: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo: string | null;
  registrado_por: number;
  registrado_por_nombres: string;
  registrado_por_apellidos: string;
  num_beneficiarios: number;
  instructores: Instructor[];
  asistentes_instructor: { id: number; nombre: string; tipo: 'titular' | 'invitado' }[];
}

interface RegistroHoras {
  id: number;
  usuario_id: number;
  nombres: string;
  apellidos: string;
  fecha: string;
  horas: number;
  estado_aprobacion: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo: string | null;
  titulo?: string;
  youtube_url?: string | null;
  tipo_podcast?: string;
  descripcion?: string;
  espacio_nombre?: string | null;
}

type Pestana = 'asistencia' | 'podcast' | 'investigacion';

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
};

export default function SupervisarAsistenciaPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [espacios, setEspacios] = useState<{ id: number; nombre: string }[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [esLider, setEsLider] = useState(false);
  const [loading, setLoading] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const [estado, setEstado] = useState('pendiente');
  const [espacioId, setEspacioId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [orden, setOrden] = useState('fecha');

  const [pestana, setPestana] = useState<Pestana>('asistencia');
  const [periodoId, setPeriodoId] = useState<string | null>(null); // null = aún sin resolver; '' = todos
  const [supervisor, setSupervisor] = useState('todos');
  const [periodos, setPeriodos] = useState<{ id: number; nombre: string; fecha_inicio: string; fecha_fin: string }[]>([]);
  const [supervisores, setSupervisores] = useState<{ id: number; nombres: string; apellidos: string }[]>([]);
  const [registrosHoras, setRegistrosHoras] = useState<RegistroHoras[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    if (periodoId) params.set('periodo_id', periodoId);
    if (supervisor) params.set('supervisor', supervisor);
    let url: string;
    if (pestana === 'asistencia') {
      if (espacioId) params.set('espacio_id', espacioId);
      if (instructorId) params.set('instructor_id', instructorId);
      if (orden) params.set('orden', orden);
      url = `/api/vinculacion/supervisar-asistencia?${params}`;
    } else {
      params.set('tipo', pestana);
      url = `/api/vinculacion/supervisar-horas?${params}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      if (pestana === 'asistencia') {
        setRegistros(data.data);
        setEspacios(data.espacios);
        setInstructores(data.instructores);
      } else {
        setRegistrosHoras(data.data);
      }
      setEsLider(!!data.esLider);
      setSupervisores(data.supervisores || []);
      if (data.periodos) {
        setPeriodos(data.periodos);
        // Período por defecto: el vigente (el que contiene hoy), o el más reciente.
        setPeriodoId(previo => {
          if (previo !== null) return previo;
          const hoy = new Date().toISOString().slice(0, 10);
          const vigente = data.periodos.find((p: any) => p.fecha_inicio.slice(0, 10) <= hoy && hoy <= p.fecha_fin.slice(0, 10));
          return String((vigente || data.periodos[0])?.id ?? '');
        });
      }
    }
    setLoading(false);
  }, [estado, espacioId, instructorId, orden, pestana, periodoId, supervisor]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!puedeSupervisarVinculacion(data.usuario)) {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/supervisar'));
  }, [router]);

  useEffect(() => {
    if (!checkingSession) cargar();
  }, [checkingSession, cargar]);

  const handleAprobar = async (id: number) => {
    setProcesandoId(id);
    setMessage('');
    try {
      const res = await fetch(`/api/vinculacion/supervisar-asistencia/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aprobar' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await cargar();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async (id: number) => {
    const motivo = window.prompt('Motivo del rechazo (opcional):') || '';
    setProcesandoId(id);
    setMessage('');
    try {
      const res = await fetch(`/api/vinculacion/supervisar-asistencia/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'rechazar', motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await cargar();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  const decidirHoras = async (registro: RegistroHoras, accion: 'aprobar' | 'rechazar') => {
    const motivo = accion === 'rechazar' ? (window.prompt('Motivo del rechazo (opcional):') || '') : '';
    setProcesandoId(registro.id);
    setMessage('');
    try {
      const res = await fetch(`/api/vinculacion/supervisar-horas/${pestana}/${registro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await cargar();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  const totalHorasAprobadas = registrosHoras.filter(r => r.estado_aprobacion === 'aprobado').reduce((suma, r) => suma + r.horas, 0);
  const totalHorasPendientes = registrosHoras.filter(r => r.estado_aprobacion === 'pendiente').reduce((suma, r) => suma + r.horas, 0);

  const horasSesion = (r: Registro) => {
    if (!r.hora_inicio || !r.hora_fin) return null;
    const [hi, mi] = r.hora_inicio.split(':').map(Number);
    const [hf, mf] = r.hora_fin.split(':').map(Number);
    const minutos = (hf * 60 + mf) - (hi * 60 + mi);
    return Math.round((minutos / 60) * 100) / 100;
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-uleam-blue mb-1">Supervisar actividades y horas</h1>
            <p className="text-gray-600 text-sm flex items-center gap-2 flex-wrap">
              {esLider ? (
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Vista Global (Superadmin / Líder)
                </span>
              ) : (
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Mis Pasantes Asignados
                </span>
              )}
              <span>Aprueba o rechaza asistencia, podcast e investigación de tus pasantes. Las horas cuentan solo al aprobar.</span>
            </p>
          </div>
          <Link href="/vinculacion/supervisar/indicadores" className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 shrink-0">
            <span>📊 Ver Indicadores & Analítica &rarr;</span>
          </Link>
        </div>

        {message && <div className="p-4 mb-6 rounded-md bg-red-50 text-red-700">{message}</div>}

        <div className="flex gap-2 mb-4 border-b border-gray-200">
          {([['asistencia', 'Asistencia'], ['podcast', 'Podcast'], ['investigacion', 'Investigación']] as [Pestana, string][]).map(([clave, etiqueta]) => (
            <button
              key={clave}
              onClick={() => setPestana(clave)}
              className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 ${pestana === clave ? 'border-uleam-blue text-uleam-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Período académico</label>
            <select value={periodoId ?? ''} onChange={e => setPeriodoId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="">Todos los períodos</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          {esLider && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Pasantes de</label>
              <select value={supervisor} onChange={e => setSupervisor(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
                <option value="todos">Todos los supervisores</option>
                <option value="yo">Solo los míos</option>
                {supervisores.map(sup => <option key={sup.id} value={sup.id}>{sup.nombres} {sup.apellidos}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="pendiente">Pendientes</option>
              <option value="aprobado">Aprobados</option>
              <option value="rechazado">Rechazados</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>

        {pestana === 'asistencia' && (
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Espacio</label>
            <select value={espacioId} onChange={e => setEspacioId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="">Todos</option>
              {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estudiante-instructor</label>
            <select value={instructorId} onChange={e => setInstructorId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="">Todos</option>
              {instructores.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ordenar por</label>
            <select value={orden} onChange={e => setOrden(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="fecha">Fecha (recientes primero)</option>
              <option value="beneficiarios">N.º de beneficiarios</option>
              <option value="espacio">Espacio</option>
              <option value="estudiante">Estudiante</option>
            </select>
          </div>
        </div>
        )}

        {pestana !== 'asistencia' && (
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="bg-green-50 text-green-800 px-3 py-1.5 rounded-lg font-semibold">Aprobadas: {Math.round(totalHorasAprobadas * 100) / 100} h</span>
            <span className="bg-yellow-50 text-yellow-800 px-3 py-1.5 rounded-lg font-semibold">Pendientes: {Math.round(totalHorasPendientes * 100) / 100} h</span>
          </div>
        )}

        {loading && <p className="text-gray-500">Cargando...</p>}
        {!loading && pestana === 'asistencia' && registros.length === 0 && (
          <p className="text-gray-400 bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center">Sin registros para este filtro.</p>
        )}

        {!loading && pestana !== 'asistencia' && registrosHoras.length === 0 && (
          <p className="text-gray-400 bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center">Sin registros para este filtro.</p>
        )}

        {pestana !== 'asistencia' && (
          <div className="space-y-4">
            {registrosHoras.map(r => (
              <div key={r.id} className="bg-white p-5 rounded-xl shadow-md flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_BADGE[r.estado_aprobacion]}`}>{r.estado_aprobacion}</span>
                    <span className="font-bold text-gray-800">{r.nombres} {r.apellidos}</span>
                    <span className="text-sm text-gray-500">{r.fecha ? new Date(r.fecha.includes('T') ? r.fecha : `${r.fecha}T00:00:00`).toLocaleDateString('es-EC') : ''}</span>
                    <span className="text-sm font-semibold text-uleam-blue">{r.horas} h</span>
                  </div>
                  {pestana === 'podcast' ? (
                    <p className="text-sm text-gray-700">
                      {r.titulo} {r.tipo_podcast && <span className="text-xs text-gray-500">({r.tipo_podcast})</span>}
                      {r.youtube_url && <a href={r.youtube_url} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline text-xs">Ver episodio</a>}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-700">{r.descripcion}{r.espacio_nombre && <span className="text-xs text-gray-500"> — {r.espacio_nombre}</span>}</p>
                  )}
                  {r.estado_aprobacion === 'rechazado' && r.motivo_rechazo && (
                    <p className="text-sm text-red-600 mt-1">Motivo de rechazo: {r.motivo_rechazo}</p>
                  )}
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  {r.estado_aprobacion !== 'aprobado' && (
                    <button onClick={() => decidirHoras(r, 'aprobar')} disabled={procesandoId === r.id} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">Aprobar</button>
                  )}
                  {r.estado_aprobacion !== 'rechazado' && (
                    <button onClick={() => decidirHoras(r, 'rechazar')} disabled={procesandoId === r.id} className="px-4 py-2 bg-red-50 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50">Rechazar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {pestana === 'asistencia' && (
        <div className="space-y-4">
          {registros.map(r => {
            const horas = horasSesion(r);
            return (
              <div key={r.id} className="bg-white p-5 rounded-xl shadow-md flex flex-col sm:flex-row gap-4">
                {r.foto_url && (
                  <a href={r.foto_url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={r.foto_url} alt="Evidencia" className="w-full sm:w-32 h-32 object-cover rounded-lg border border-gray-200" />
                  </a>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_BADGE[r.estado_aprobacion]}`}>{r.estado_aprobacion}</span>
                    <span className="font-bold text-gray-800">{r.espacio_nombre}</span>
                    <span className="text-sm text-gray-500">
                      {(() => {
                        if (!r.fecha) return '';
                        const dateObj = new Date(r.fecha.includes('T') ? r.fecha : `${r.fecha}T00:00:00`);
                        return isNaN(dateObj.getTime()) ? r.fecha : dateObj.toLocaleDateString('es-EC');
                      })()}
                    </span>
                    {r.hora_inicio && r.hora_fin && (
                      <span className="text-sm text-gray-500">{r.hora_inicio.slice(0,5)}–{r.hora_fin.slice(0,5)}{horas !== null && ` (${horas} h)`}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">Registrado por: <strong>{r.registrado_por_nombres} {r.registrado_por_apellidos}</strong></p>
                  <p className="text-sm text-gray-700">Beneficiarios presentes: <strong>{r.num_beneficiarios}</strong></p>
                  {r.instructores.length > 0 && (
                    <p className="text-xs text-gray-500">Instructores del espacio: {r.instructores.map(i => i.nombre).join(', ')}</p>
                  )}
                  {r.asistentes_instructor?.length > 0 && (
                    <p className="text-sm text-gray-700 mt-1">
                      Pasantes que asistieron:{' '}
                      {r.asistentes_instructor.map((a, idx) => (
                        <span key={a.id}>
                          {idx > 0 && ', '}
                          <strong>{a.nombre}</strong>
                          {a.tipo === 'invitado' && <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">Invitado</span>}
                        </span>
                      ))}
                    </p>
                  )}
                  {r.observaciones && <p className="text-sm text-gray-600 mt-1 italic">"{r.observaciones}"</p>}
                  {r.estado_aprobacion === 'rechazado' && r.motivo_rechazo && (
                    <p className="text-sm text-red-600 mt-1">Motivo de rechazo: {r.motivo_rechazo}</p>
                  )}
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  {r.estado_aprobacion !== 'aprobado' && (
                    <button
                      onClick={() => handleAprobar(r.id)}
                      disabled={procesandoId === r.id}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                  )}
                  {r.estado_aprobacion !== 'rechazado' && (
                    <button
                      onClick={() => handleRechazar(r.id)}
                      disabled={procesandoId === r.id}
                      className="px-4 py-2 bg-red-50 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
