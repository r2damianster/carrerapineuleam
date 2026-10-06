'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { puedeSupervisarVinculacion } from '@/lib/modulos';
import EditorEpisodioPodcast from '@/components/EditorEpisodioPodcast';

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
  foto_descartada?: boolean;
  posibles_duplicados?: number[];
  auditoria_ia_estado?: 'ok' | 'discrepancia' | 'no_disponible' | 'pendiente' | null;
  auditoria_ia_conteo_detectado?: number | null;
  auditoria_ia_conteo_esperado?: number | null;
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
  video_id?: string;
  tipo_podcast?: string;
  descripcion?: string;
  espacio_nombre?: string | null;
  proyecto_nombre?: string | null;
  video_aprobado_sitio?: boolean;
  puede_publicar?: boolean;
}

type TipoHoras = 'podcast' | 'investigacion' | 'autonomas';
type TipoRegistro = 'asistencia' | TipoHoras;
type FiltroTipo = 'todos' | TipoRegistro;

const TIPOS_REGISTRO: TipoRegistro[] = ['asistencia', 'podcast', 'investigacion', 'autonomas'];

// Etiqueta de color por tipo: todo lo supervisable va en una sola lista, distinguido por esta marca.
const ETIQUETA_TIPO: Record<TipoRegistro, { texto: string; clases: string }> = {
  asistencia: { texto: 'Asistencia', clases: 'bg-sky-100 text-sky-800' },
  podcast: { texto: 'Podcast', clases: 'bg-purple-100 text-purple-800' },
  investigacion: { texto: 'Investigación', clases: 'bg-indigo-100 text-indigo-800' },
  autonomas: { texto: 'Autónoma', clases: 'bg-amber-100 text-amber-800' },
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
};

type RegistroUnificado =
  | { clave: string; tipo: 'asistencia'; marcaTiempo: number; estado: string; asistencia: Registro }
  | { clave: string; tipo: TipoHoras; marcaTiempo: number; estado: string; horas: RegistroHoras };

// Vista agrupada: varias filas de horas_podcast_pasante (una por pasante) que comparten el mismo episodio.
type RegistroPodcast = { clave: string; tipo: 'podcast'; marcaTiempo: number; estado: string; horas: RegistroHoras };

const aMarcaTiempo = (fecha: string | null | undefined) => {
  if (!fecha) return 0;
  const fechaObjeto = new Date(fecha.includes('T') ? fecha : `${fecha}T00:00:00`);
  return isNaN(fechaObjeto.getTime()) ? 0 : fechaObjeto.getTime();
};

const horasSesion = (r: Registro) => {
  if (!r.hora_inicio || !r.hora_fin) return null;
  const [hi, mi] = r.hora_inicio.split(':').map(Number);
  const [hf, mf] = r.hora_fin.split(':').map(Number);
  const minutos = (hf * 60 + mf) - (hi * 60 + mi);
  return Math.round((minutos / 60) * 100) / 100;
};

const formatearFecha = (fecha: string | null | undefined) => {
  if (!fecha) return '';
  const fechaObjeto = new Date(fecha.includes('T') ? fecha : `${fecha}T00:00:00`);
  return isNaN(fechaObjeto.getTime()) ? fecha : fechaObjeto.toLocaleDateString('es-EC');
};

export default function SupervisarAsistenciaPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [registrosAsistencia, setRegistrosAsistencia] = useState<Registro[]>([]);
  const [registrosHoras, setRegistrosHoras] = useState<{ tipo: TipoHoras; registro: RegistroHoras }[]>([]);
  const [espacios, setEspacios] = useState<{ id: number; nombre: string }[]>([]);
  const [instructores, setInstructores] = useState<Instructor[]>([]);
  const [esLider, setEsLider] = useState(false);
  const [loading, setLoading] = useState(false);
  const [procesandoClave, setProcesandoClave] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const [estado, setEstado] = useState('pendiente');
  const [espacioId, setEspacioId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  // Filtro por etiqueta: todos (por defecto) o un solo tipo.
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  // Editor de episodios de podcast: undefined = cerrado, null = elegir un video, string = editar ese video.
  const [episodioEnEdicion, setEpisodioEnEdicion] = useState<string | null | undefined>(undefined);
  // Sesión 53: publicar un episodio (video + actividad) sin pasar por /admin/videos.
  // videoId abierto para confirmar, con sus dos casillas de menores/calidad.
  const [publicandoVideoId, setPublicandoVideoId] = useState<string | null>(null);
  const [confirmarMenores, setConfirmarMenores] = useState(false);
  const [confirmarCalidadMala, setConfirmarCalidadMala] = useState(false);
  const [publicandoEnCurso, setPublicandoEnCurso] = useState(false);
  // Si viene de "Aprobar" del episodio (no de "Publicar en el sitio" suelto): el mismo diálogo
  // de menores/calidad aprueba las horas pendientes del grupo Y decide la publicación, en un solo paso.
  const [aprobandoGrupoPodcast, setAprobandoGrupoPodcast] = useState<RegistroPodcast[] | null>(null);
  // Sesión 53: aprobar asistencia también confirma menores/calidad de la foto (no bloquea las
  // horas del pasante — solo decide si la foto se puede usar en web e informes).
  const [confirmandoAsistencia, setConfirmandoAsistencia] = useState<RegistroUnificado | null>(null);
  const [periodoId, setPeriodoId] = useState<string | null>(null); // null = aún sin resolver; '' = todos
  const [supervisor, setSupervisor] = useState('todos');
  const [periodos, setPeriodos] = useState<{ id: number; nombre: string; fecha_inicio: string; fecha_fin: string }[]>([]);
  const [supervisores, setSupervisores] = useState<{ id: number; nombres: string; apellidos: string }[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    const parametrosBase = new URLSearchParams();
    if (estado) parametrosBase.set('estado', estado);
    if (periodoId) parametrosBase.set('periodo_id', periodoId);
    if (supervisor) parametrosBase.set('supervisor', supervisor);

    const parametrosAsistencia = new URLSearchParams(parametrosBase);
    if (espacioId) parametrosAsistencia.set('espacio_id', espacioId);
    if (instructorId) parametrosAsistencia.set('instructor_id', instructorId);
    parametrosAsistencia.set('orden', 'fecha');

    const urlHoras = (tipo: TipoHoras) => {
      const parametros = new URLSearchParams(parametrosBase);
      parametros.set('tipo', tipo);
      if (instructorId) parametros.set('pasante_id', instructorId);
      return `/api/vinculacion/supervisar-horas?${parametros}`;
    };

    try {
      const tiposHoras: TipoHoras[] = ['podcast', 'investigacion', 'autonomas'];
      const [respuestaAsistencia, ...respuestasHoras] = await Promise.all([
        fetch(`/api/vinculacion/supervisar-asistencia?${parametrosAsistencia}`).then(r => r.json()),
        ...tiposHoras.map(tipo => fetch(urlHoras(tipo)).then(r => r.json())),
      ]);

      if (respuestaAsistencia.success) {
        setRegistrosAsistencia(respuestaAsistencia.data);
        setEspacios(respuestaAsistencia.espacios);
        setInstructores(respuestaAsistencia.instructores);
        setEsLider(!!respuestaAsistencia.esLider);
        setSupervisores(respuestaAsistencia.supervisores || []);
        if (respuestaAsistencia.periodos) {
          setPeriodos(respuestaAsistencia.periodos);
          // Período por defecto: el vigente (el que contiene hoy), o el más reciente.
          setPeriodoId(previo => {
            if (previo !== null) return previo;
            const hoy = new Date().toISOString().slice(0, 10);
            const vigente = respuestaAsistencia.periodos.find((p: any) => p.fecha_inicio.slice(0, 10) <= hoy && hoy <= p.fecha_fin.slice(0, 10));
            return String((vigente || respuestaAsistencia.periodos[0])?.id ?? '');
          });
        }
      }

      const horasUnificadas: { tipo: TipoHoras; registro: RegistroHoras }[] = [];
      respuestasHoras.forEach((respuesta, indice) => {
        if (respuesta.success) {
          respuesta.data.forEach((registro: RegistroHoras) => horasUnificadas.push({ tipo: tiposHoras[indice], registro }));
        }
      });
      setRegistrosHoras(horasUnificadas);
    } finally {
      setLoading(false);
    }
  }, [estado, espacioId, instructorId, periodoId, supervisor]);

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

  // Lista única: asistencia + podcast + investigación + autónomas, pendientes primero y luego más recientes.
  const registrosUnificados: RegistroUnificado[] = [
    ...registrosAsistencia.map((asistencia): RegistroUnificado => ({
      clave: `asistencia-${asistencia.id}`,
      tipo: 'asistencia',
      marcaTiempo: aMarcaTiempo(asistencia.fecha),
      estado: asistencia.estado_aprobacion,
      asistencia,
    })),
    ...registrosHoras.map(({ tipo, registro }): RegistroUnificado => ({
      clave: `${tipo}-${registro.id}`,
      tipo,
      marcaTiempo: aMarcaTiempo(registro.fecha),
      estado: registro.estado_aprobacion,
      horas: registro,
    })),
  ].sort((a, b) => {
    const pendienteA = a.estado === 'pendiente' ? 1 : 0;
    const pendienteB = b.estado === 'pendiente' ? 1 : 0;
    if (pendienteA !== pendienteB) return pendienteB - pendienteA;
    return b.marcaTiempo - a.marcaTiempo;
  });

  const conteoPorTipo = (tipo: TipoRegistro) => registrosUnificados.filter(registro => registro.tipo === tipo).length;
  const registrosVisibles = filtroTipo === 'todos'
    ? registrosUnificados
    : registrosUnificados.filter(registro => registro.tipo === filtroTipo);

  const decidir = async (
    registro: RegistroUnificado,
    accion: 'aprobar' | 'rechazar',
    confirmacionFoto?: { hay_menores: boolean; calidad_mala: boolean }
  ) => {
    const motivo = accion === 'rechazar' ? (window.prompt('Motivo del rechazo (opcional):') || '') : '';
    setProcesandoClave(registro.clave);
    setMessage('');
    try {
      const url = registro.tipo === 'asistencia'
        ? `/api/vinculacion/supervisar-asistencia/${registro.asistencia.id}`
        : `/api/vinculacion/supervisar-horas/${registro.tipo}/${registro.horas.id}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, motivo, ...confirmacionFoto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await cargar();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setProcesandoClave(null);
    }
  };

  // Aprueba/rechaza en un solo clic todas las filas de horas de un mismo episodio de podcast
  // (una fila por pasante participante) — un episodio con 2 pasantes se decide junto, no por separado.
  const decidirGrupoPodcast = async (
    grupo: RegistroPodcast[],
    accion: 'aprobar' | 'rechazar'
  ) => {
    const pendientes = grupo.filter(r => (accion === 'aprobar' ? r.estado !== 'aprobado' : r.estado !== 'rechazado'));
    if (pendientes.length === 0) return;
    const motivo = accion === 'rechazar' ? (window.prompt('Motivo del rechazo (opcional):') || '') : '';
    setProcesandoClave(grupo[0].clave);
    setMessage('');
    const errores: string[] = [];
    for (const reg of pendientes) {
      try {
        const res = await fetch(`/api/vinculacion/supervisar-horas/podcast/${reg.horas.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion, motivo }),
        });
        const data = await res.json();
        if (!res.ok) errores.push(`${reg.horas.nombres} ${reg.horas.apellidos}: ${data.error}`);
      } catch (err: any) {
        errores.push(`${reg.horas.nombres} ${reg.horas.apellidos}: ${err.message}`);
      }
    }
    if (errores.length > 0) setMessage(`Algunas horas no se pudieron procesar — ${errores.join(' · ')}`);
    await cargar();
    setProcesandoClave(null);
  };

  // Sesión 53: aprobar y publicar el video (+ actividad asociada) sin pasar por /admin/videos —
  // si viene del botón "Aprobar" del episodio (aprobandoGrupoPodcast no nulo), primero aprueba las
  // horas pendientes de todos los pasantes del grupo y recién después decide la publicación —
  // un solo diálogo, un solo clic, en vez de aprobar horas y publicar como 2 pasos separados.
  const publicarVideo = async (videoId: string) => {
    setPublicandoEnCurso(true);
    setMessage('');
    const mensajes: string[] = [];
    try {
      if (aprobandoGrupoPodcast) {
        const pendientes = aprobandoGrupoPodcast.filter(r => r.estado !== 'aprobado');
        for (const reg of pendientes) {
          try {
            const resHoras = await fetch(`/api/vinculacion/supervisar-horas/podcast/${reg.horas.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accion: 'aprobar', motivo: '' }),
            });
            const dataHoras = await resHoras.json();
            if (!resHoras.ok) mensajes.push(`Horas de ${reg.horas.nombres} ${reg.horas.apellidos}: ${dataHoras.error}`);
          } catch (err: any) {
            mensajes.push(`Horas de ${reg.horas.nombres} ${reg.horas.apellidos}: ${err.message}`);
          }
        }
      }

      const res = await fetch(`/api/videos/${videoId}/aprobar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hay_menores: confirmarMenores, calidad_mala: confirmarCalidadMala }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      mensajes.push(data.publicado ? 'Episodio publicado en el sitio.' : (data.mensaje || 'No se publicó.'));
      setMessage(mensajes.join(' · '));
      setPublicandoVideoId(null);
      setAprobandoGrupoPodcast(null);
      setConfirmarMenores(false);
      setConfirmarCalidadMala(false);
      await cargar();
    } catch (err: any) {
      mensajes.push(`Error: ${err.message}`);
      setMessage(mensajes.join(' · '));
    } finally {
      setPublicandoEnCurso(false);
    }
  };

  const registrosConHoras = registrosVisibles.filter(
    (registro): registro is Extract<RegistroUnificado, { horas: RegistroHoras }> => registro.tipo !== 'asistencia'
  );
  // Resumen de horas por pasante y tipo (según los filtros activos). Asistencia: horas de la sesión
  // para cada pasante que asistió (titular o invitado); si hay un pasante filtrado, solo él.
  type HorasPorEstado = { aprobado: number; pendiente: number };
  const resumenPorPasante = (() => {
    const mapa = new Map<string, { nombre: string; tipos: Record<TipoRegistro, HorasPorEstado> }>();
    const vacio = (): Record<TipoRegistro, HorasPorEstado> => ({
      asistencia: { aprobado: 0, pendiente: 0 },
      podcast: { aprobado: 0, pendiente: 0 },
      investigacion: { aprobado: 0, pendiente: 0 },
      autonomas: { aprobado: 0, pendiente: 0 },
    });
    const sumar = (pasanteId: number, nombre: string, tipo: TipoRegistro, estadoRegistro: string, horas: number) => {
      if (estadoRegistro !== 'aprobado' && estadoRegistro !== 'pendiente') return;
      if (instructorId && String(pasanteId) !== instructorId) return;
      const clave = String(pasanteId);
      if (!mapa.has(clave)) mapa.set(clave, { nombre, tipos: vacio() });
      mapa.get(clave)!.tipos[tipo][estadoRegistro] += horas;
    };
    registrosVisibles.forEach(registro => {
      if (registro.tipo === 'asistencia') {
        const duracion = horasSesion(registro.asistencia) ?? 0;
        registro.asistencia.asistentes_instructor.forEach(asistente =>
          sumar(asistente.id, asistente.nombre, 'asistencia', registro.estado, duracion));
      } else {
        sumar(registro.horas.usuario_id, `${registro.horas.nombres} ${registro.horas.apellidos}`, registro.tipo, registro.estado, registro.horas.horas);
      }
    });
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  })();
  const redondear = (valor: number) => Math.round(valor * 100) / 100;

  const totalHorasAprobadas = registrosConHoras.filter(r => r.estado === 'aprobado').reduce((suma, r) => suma + r.horas.horas, 0);
  const totalHorasPendientes = registrosConHoras.filter(r => r.estado === 'pendiente').reduce((suma, r) => suma + r.horas.horas, 0);

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  const mostrarFiltrosAsistencia = filtroTipo === 'todos' || filtroTipo === 'asistencia';

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
              <span>Todo lo que debes aprobar, en una sola lista. Las horas cuentan solo al aprobar.</span>
            </p>
          </div>
          <Link href="/vinculacion/supervisar/indicadores" className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 shrink-0">
            <span>📊 Ver Indicadores & Analítica &rarr;</span>
          </Link>
        </div>

        {message && <div className="p-4 mb-6 rounded-md bg-red-50 text-red-700">{message}</div>}

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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pasante (todos los tipos)</label>
            <select value={instructorId} onChange={e => setInstructorId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="">Todos</option>
              {instructores.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>
          {mostrarFiltrosAsistencia && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Espacio (asistencia)</label>
              <select value={espacioId} onChange={e => setEspacioId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm">
                <option value="">Todos</option>
                {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          )}
        </div>

        {resumenPorPasante.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-sm mb-4 overflow-x-auto">
            <h2 className="text-sm font-bold text-gray-800 mb-2">Horas por pasante (según filtros) — aprobadas / pendientes</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-1 pr-3">Pasante</th>
                  {TIPOS_REGISTRO.map(tipo => <th key={tipo} className="py-1 px-2">{ETIQUETA_TIPO[tipo].texto}</th>)}
                  <th className="py-1 pl-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumenPorPasante.map(fila => {
                  const totalAprobado = TIPOS_REGISTRO.reduce((suma, tipo) => suma + fila.tipos[tipo].aprobado, 0);
                  const totalPendiente = TIPOS_REGISTRO.reduce((suma, tipo) => suma + fila.tipos[tipo].pendiente, 0);
                  return (
                    <tr key={fila.nombre} className="border-t border-gray-100">
                      <td className="py-1.5 pr-3 font-medium text-gray-800">{fila.nombre}</td>
                      {TIPOS_REGISTRO.map(tipo => (
                        <td key={tipo} className="py-1.5 px-2 text-gray-700">
                          <span className="text-green-700 font-semibold">{redondear(fila.tipos[tipo].aprobado)}</span>
                          {' / '}
                          <span className="text-yellow-700">{redondear(fila.tipos[tipo].pendiente)}</span>
                        </td>
                      ))}
                      <td className="py-1.5 pl-2 font-semibold">
                        <span className="text-green-700">{redondear(totalAprobado)}</span>
                        {' / '}
                        <span className="text-yellow-700">{redondear(totalPendiente)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[11px] text-gray-400 mt-2">Cambia "Estado" a "Todos" para ver aprobadas y pendientes juntas. Rechazadas no suman.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-medium text-gray-500">Tipo:</span>
          <button
            onClick={() => setFiltroTipo('todos')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${filtroTipo === 'todos' ? 'bg-uleam-blue text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
          >
            Todos ({registrosUnificados.length})
          </button>
          {TIPOS_REGISTRO.map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${filtroTipo === tipo ? `${ETIQUETA_TIPO[tipo].clases} border-current` : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
            >
              {ETIQUETA_TIPO[tipo].texto} ({conteoPorTipo(tipo)})
            </button>
          ))}
          {(filtroTipo === 'todos' || filtroTipo === 'podcast') && (
            <button onClick={() => setEpisodioEnEdicion(null)} className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-uleam-blue text-white hover:opacity-90">
              + Asignar horas de un episodio ya subido
            </button>
          )}
        </div>

        {confirmandoAsistencia && confirmandoAsistencia.tipo === 'asistencia' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6">
              <h2 className="text-lg font-bold text-gray-800">Aprobar asistencia</h2>
              <p className="text-sm text-gray-600">Las horas del pasante se acreditan igual, sin importar esto. Solo decide si la foto se puede usar en la web y en los informes.</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={confirmarMenores} onChange={(e) => setConfirmarMenores(e.target.checked)} />
                ¿Aparecen menores de edad sin haberlo declarado?
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={confirmarCalidadMala} onChange={(e) => setConfirmarCalidadMala(e.target.checked)} />
                ¿La foto es de mala calidad para la web?
              </label>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setConfirmandoAsistencia(null); setConfirmarMenores(false); setConfirmarCalidadMala(false); }} className="rounded border px-4 py-2 text-sm">Cancelar</button>
                <button
                  disabled={procesandoClave === confirmandoAsistencia.clave}
                  onClick={async () => {
                    await decidir(confirmandoAsistencia, 'aprobar', { hay_menores: confirmarMenores, calidad_mala: confirmarCalidadMala });
                    setConfirmandoAsistencia(null);
                    setConfirmarMenores(false);
                    setConfirmarCalidadMala(false);
                  }}
                  className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Aprobar asistencia
                </button>
              </div>
            </div>
          </div>
        )}

        {publicandoVideoId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6">
              <h2 className="text-lg font-bold text-gray-800">
                {aprobandoGrupoPodcast ? 'Aprobar horas y publicar episodio' : 'Publicar episodio en el sitio'}
              </h2>
              {aprobandoGrupoPodcast && (
                <p className="text-sm text-gray-600">
                  Se aprueban las horas de {aprobandoGrupoPodcast.map(g => `${g.horas.nombres} ${g.horas.apellidos}`).join(' y ')} — eso no depende de lo que marques abajo.
                </p>
              )}
              <p className="text-sm text-gray-600">Confirma antes de publicar. Si marcas cualquiera de las dos, el episodio no se publica y su foto queda descartada.</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={confirmarMenores} onChange={(e) => setConfirmarMenores(e.target.checked)} />
                ¿Aparecen menores de edad sin haberlo declarado?
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={confirmarCalidadMala} onChange={(e) => setConfirmarCalidadMala(e.target.checked)} />
                ¿La foto/portada es de mala calidad para la web?
              </label>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setPublicandoVideoId(null); setAprobandoGrupoPodcast(null); setConfirmarMenores(false); setConfirmarCalidadMala(false); }} className="rounded border px-4 py-2 text-sm">Cancelar</button>
                <button disabled={publicandoEnCurso} onClick={() => publicarVideo(publicandoVideoId)} className="rounded bg-uleam-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {publicandoEnCurso ? 'Guardando…' : (confirmarMenores || confirmarCalidadMala ? 'Aprobar horas y descartar foto' : (aprobandoGrupoPodcast ? 'Aprobar y publicar' : 'Publicar'))}
                </button>
              </div>
            </div>
          </div>
        )}

        {registrosConHoras.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="bg-green-50 text-green-800 px-3 py-1.5 rounded-lg font-semibold">Horas aprobadas (podcast, investigación, autónomas): {Math.round(totalHorasAprobadas * 100) / 100} h</span>
            <span className="bg-yellow-50 text-yellow-800 px-3 py-1.5 rounded-lg font-semibold">Pendientes: {Math.round(totalHorasPendientes * 100) / 100} h</span>
          </div>
        )}

        {loading && <p className="text-gray-500">Cargando...</p>}
        {!loading && registrosVisibles.length === 0 && (
          <p className="text-gray-400 bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center">Sin registros para este filtro.</p>
        )}

        {episodioEnEdicion !== undefined && (
          <EditorEpisodioPodcast
            videoId={episodioEnEdicion}
            onCerrar={() => setEpisodioEnEdicion(undefined)}
            onGuardado={() => { setEpisodioEnEdicion(undefined); cargar(); }}
          />
        )}

        {/* Secciones por categoría: solo aparecen las que tienen registros con el filtro actual. */}
        {TIPOS_REGISTRO.map(tipoGrupo => {
          const registrosDelGrupo = registrosVisibles.filter(registro => registro.tipo === tipoGrupo);
          if (registrosDelGrupo.length === 0) return null;

          if (tipoGrupo === 'podcast') {
            // Un episodio puede tener varios pasantes (titulares + invitados) — una fila de horas
            // por cada uno, pero se agrupan en UNA sola tarjeta con un solo Aprobar/Rechazar.
            const gruposPorVideo = new Map<string, RegistroPodcast[]>();
            (registrosDelGrupo as unknown as RegistroPodcast[]).forEach(reg => {
              const clave = reg.horas.video_id || reg.clave;
              if (!gruposPorVideo.has(clave)) gruposPorVideo.set(clave, []);
              gruposPorVideo.get(clave)!.push(reg);
            });
            const grupos = Array.from(gruposPorVideo.values());

            return (
              <section key="podcast" className="mb-8">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ETIQUETA_TIPO.podcast.clases}`}>{ETIQUETA_TIPO.podcast.texto}</span>
                  <span className="text-sm font-medium text-gray-500">{grupos.length} {grupos.length === 1 ? 'episodio' : 'episodios'}</span>
                </h2>
                <div className="space-y-4">
                  {grupos.map(grupo => {
                    const primero = grupo[0].horas;
                    const todosAprobados = grupo.every(g => g.estado === 'aprobado');
                    const algunoPendiente = grupo.some(g => g.estado === 'pendiente');
                    const algunoNoRechazado = grupo.some(g => g.estado !== 'rechazado');
                    const procesandoGrupo = grupo.some(g => g.clave === procesandoClave);
                    return (
                      <div key={primero.video_id || grupo[0].clave} className="bg-white p-5 rounded-xl shadow-md flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {grupo.map(g => (
                              <span key={g.clave} className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_BADGE[g.estado]}`}>
                                {g.horas.nombres} {g.horas.apellidos}: {g.estado}
                              </span>
                            ))}
                            <span className="text-sm text-gray-500">{formatearFecha(primero.fecha)}</span>
                            <span className="text-sm font-semibold text-uleam-blue">{primero.horas} h c/u</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {primero.titulo} {primero.tipo_podcast && <span className="text-xs text-gray-500">({primero.tipo_podcast})</span>}
                            {primero.youtube_url && <a href={primero.youtube_url} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline text-xs">Ver episodio</a>}
                          </p>
                          {grupo.filter(g => g.estado === 'rechazado' && g.horas.motivo_rechazo).map(g => (
                            <p key={g.clave} className="text-sm text-red-600 mt-1">Motivo de rechazo ({g.horas.nombres}): {g.horas.motivo_rechazo}</p>
                          ))}
                        </div>
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          {primero.video_id && (
                            <button onClick={() => setEpisodioEnEdicion(primero.video_id!)} className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100">Editar episodio</button>
                          )}
                          {primero.video_id && primero.video_aprobado_sitio && (
                            <span className="px-3 py-2 text-xs font-semibold text-green-700 text-center">Ya publicado</span>
                          )}
                          {/* Sin pendientes: fallback para publicar un episodio cuyas horas ya se aprobaron por otra vía. */}
                          {primero.video_id && !primero.video_aprobado_sitio && primero.puede_publicar && !algunoPendiente && todosAprobados && (
                            <button onClick={() => setPublicandoVideoId(primero.video_id!)} className="px-4 py-2 bg-uleam-gold text-uleam-blue text-sm font-semibold rounded-lg hover:brightness-95">Publicar en el sitio</button>
                          )}
                          {algunoPendiente && primero.video_id && !primero.video_aprobado_sitio && primero.puede_publicar && (
                            <button
                              onClick={() => { setAprobandoGrupoPodcast(grupo); setPublicandoVideoId(primero.video_id!); }}
                              disabled={procesandoGrupo}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              Aprobar{grupo.length > 1 ? ` (${grupo.length})` : ''}
                            </button>
                          )}
                          {algunoPendiente && (!primero.video_id || primero.video_aprobado_sitio || !primero.puede_publicar) && (
                            <button
                              onClick={() => decidirGrupoPodcast(grupo, 'aprobar')}
                              disabled={procesandoGrupo}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              Aprobar{grupo.length > 1 ? ` (${grupo.length})` : ''}
                            </button>
                          )}
                          {algunoNoRechazado && (
                            <button
                              onClick={() => decidirGrupoPodcast(grupo, 'rechazar')}
                              disabled={procesandoGrupo}
                              className="px-4 py-2 bg-red-50 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50"
                            >
                              Rechazar{grupo.length > 1 ? ` (${grupo.length})` : ''}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          return (
        <section key={tipoGrupo} className="mb-8">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ETIQUETA_TIPO[tipoGrupo].clases}`}>{ETIQUETA_TIPO[tipoGrupo].texto}</span>
            <span className="text-sm font-medium text-gray-500">{registrosDelGrupo.length} {registrosDelGrupo.length === 1 ? 'registro' : 'registros'}</span>
          </h2>
        <div className="space-y-4">
          {registrosDelGrupo.map(registro => {
            const etiqueta = ETIQUETA_TIPO[registro.tipo];
            const botonesDecision = (
              <div className="flex sm:flex-col gap-2 shrink-0">
                {registro.tipo === 'podcast' && registro.horas.video_id && (
                  <button onClick={() => setEpisodioEnEdicion(registro.horas.video_id!)} className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100">Editar episodio</button>
                )}
                {registro.tipo === 'podcast' && registro.horas.video_id && registro.horas.puede_publicar && !registro.horas.video_aprobado_sitio && (
                  <button onClick={() => setPublicandoVideoId(registro.horas.video_id!)} className="px-4 py-2 bg-uleam-gold text-uleam-blue text-sm font-semibold rounded-lg hover:brightness-95">Publicar en el sitio</button>
                )}
                {registro.tipo === 'podcast' && registro.horas.video_id && registro.horas.video_aprobado_sitio && (
                  <span className="px-3 py-2 text-xs font-semibold text-green-700 text-center">Ya publicado</span>
                )}
                {registro.estado !== 'aprobado' && (
                  <button
                    onClick={() => registro.tipo === 'asistencia' && registro.asistencia.foto_url ? setConfirmandoAsistencia(registro) : decidir(registro, 'aprobar')}
                    disabled={procesandoClave === registro.clave}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                )}
                {registro.estado !== 'rechazado' && (
                  <button onClick={() => decidir(registro, 'rechazar')} disabled={procesandoClave === registro.clave} className="px-4 py-2 bg-red-50 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50">Rechazar</button>
                )}
              </div>
            );

            if (registro.tipo === 'asistencia') {
              const r = registro.asistencia;
              const horas = horasSesion(r);
              return (
                <div key={registro.clave} className="bg-white p-5 rounded-xl shadow-md flex flex-col sm:flex-row gap-4">
                  {r.foto_url && (
                    <div className="shrink-0">
                      <a href={r.foto_url} target="_blank" rel="noreferrer">
                        <img src={r.foto_url} alt="Evidencia" className={`w-full sm:w-32 h-32 object-cover rounded-lg border border-gray-200 ${r.foto_descartada ? 'opacity-60' : ''}`} />
                      </a>
                      {r.foto_descartada && (
                        <p className="mt-1 max-w-[8rem] text-[11px] font-semibold text-red-700">Descartada: no se usa en la web ni en los informes</p>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${etiqueta.clases}`}>{etiqueta.texto}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_BADGE[r.estado_aprobacion]}`}>{r.estado_aprobacion}</span>
                      {r.estado_aprobacion !== 'rechazado' && (r.posibles_duplicados?.length ?? 0) > 0 && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800" title="Mismo espacio y día, horario cruzado y beneficiarios en común con otro registro no rechazado. Puede ser un grupo distinto: revísalo.">
                          Posible duplicado de {r.posibles_duplicados!.map((idOtro) => `#${idOtro}`).join(', ')}
                        </span>
                      )}
                      {r.auditoria_ia_estado === 'discrepancia' && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-800" title="La IA es solo de apoyo — no invalida el registro por sí sola, revísalo.">
                          IA: conteo no coincide (detectó {r.auditoria_ia_conteo_detectado}, esperaba {r.auditoria_ia_conteo_esperado})
                        </span>
                      )}
                      {r.auditoria_ia_estado === 'no_disponible' && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          Auditoría IA no disponible (cuota agotada)
                        </span>
                      )}
                      <span className="font-bold text-gray-800">{r.espacio_nombre}</span>
                      <span className="text-sm text-gray-500">{formatearFecha(r.fecha)}</span>
                      {r.hora_inicio && r.hora_fin && (
                        <span className="text-sm text-gray-500">{r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}{horas !== null && ` (${horas} h)`}</span>
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
                  {botonesDecision}
                </div>
              );
            }

            const r = registro.horas;
            return (
              <div key={registro.clave} className="bg-white p-5 rounded-xl shadow-md flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${etiqueta.clases}`}>{etiqueta.texto}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_BADGE[r.estado_aprobacion]}`}>{r.estado_aprobacion}</span>
                    <span className="font-bold text-gray-800">{r.nombres} {r.apellidos}</span>
                    <span className="text-sm text-gray-500">{formatearFecha(r.fecha)}</span>
                    <span className="text-sm font-semibold text-uleam-blue">{r.horas} h</span>
                  </div>
                  {registro.tipo === 'podcast' ? (
                    <p className="text-sm text-gray-700">
                      {r.titulo} {r.tipo_podcast && <span className="text-xs text-gray-500">({r.tipo_podcast})</span>}
                      {r.youtube_url && <a href={r.youtube_url} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline text-xs">Ver episodio</a>}
                    </p>
                  ) : (
                    <>
                    <p className="text-sm text-gray-700">{r.descripcion}{r.espacio_nombre && <span className="text-xs text-gray-500"> — {r.espacio_nombre}</span>}</p>
                    {r.proyecto_nombre && <p className="text-xs text-emerald-700">Aporta al proyecto: {r.proyecto_nombre}</p>}
                    </>
                  )}
                  {r.estado_aprobacion === 'rechazado' && r.motivo_rechazo && (
                    <p className="text-sm text-red-600 mt-1">Motivo de rechazo: {r.motivo_rechazo}</p>
                  )}
                </div>
                {botonesDecision}
              </div>
            );
          })}
        </div>
        </section>
          );
        })}
      </div>
    </div>
  );
}
