'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS_DISPONIBLES = Array.from({ length: 5 }, (_, indiceAnio) => String(ANIO_ACTUAL + 1 - indiceAnio));

function InformesVinculacionContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipoQuery = searchParams.get('tipo'); // 'supervisor' | 'lider'

  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tab, setTab] = useState<'supervisor' | 'lider' | 'historial'>('supervisor');

  const [usuario, setUsuario] = useState<any>(null);
  const [esLider, setEsLider] = useState(false);
  const [esSupervisor, setEsSupervisor] = useState(false);

  // Filtros
  const hoyEcuador = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 7);
  const [mes, setMes] = useState(hoyEcuador);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [cicloId, setCicloId] = useState<string>('');

  // Datos de Informe
  const [datosSupervisor, setDatosSupervisor] = useState<any>(null);
  const [datosLider, setDatosLider] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);

  // Obstáculos CRUD (Supervisor)
  const [obstaculos, setObstaculos] = useState<any[]>([]);
  const [nuevoObsDesc, setNuevoObsDesc] = useState('');
  const [nuevoObsImpacto, setNuevoObsImpacto] = useState('medio');
  const [nuevoObsRecom, setNuevoObsRecom] = useState('');

  // Redacción con IA (Líder)
  const [redactandoClave, setRedactandoClave] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setUsuario(data.usuario);
        const lider = data.usuario.rol === 'admin' ||
          data.usuario.email === 'arturo.rodriguez@uleam.edu.ec' ||
          data.usuario.email === 'cintya.gamez@uleam.edu.ec' ||
          (Array.isArray(data.usuario.modulos_acceso) && data.usuario.modulos_acceso.includes('vinculacion_gestion'));
        
        const supervisor = lider || (Array.isArray(data.usuario.modulos_acceso) && data.usuario.modulos_acceso.includes('vinculacion'));
        setEsLider(lider);
        setEsSupervisor(supervisor);

        if (tipoQuery === 'lider' && lider) {
          setTab('lider');
        } else if (tipoQuery === 'supervisor') {
          setTab('supervisor');
        } else {
          setTab(lider ? 'lider' : 'supervisor');
        }
        setLoading(false);
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/informes'));
  }, [router, tipoQuery]);

  useEffect(() => {
    fetch('/vinculacion/proyecto/api?seccion=ficha')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.ciclos) {
          setCiclos(data.ciclos);
          if (data.ciclos.length > 0) setCicloId(String(data.ciclos[0].id));
        }
      })
      .catch(() => {});
  }, []);

  // Cargar datos al cambiar mes/tab/ciclo
  useEffect(() => {
    if (!usuario) return;
    if (tab === 'supervisor') {
      setLoading(true);
      fetch(`/vinculacion/informes/api?accion=datos&tipo=supervisor&mes=${mes}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setDatosSupervisor(d.datos);
        })
        .finally(() => setLoading(false));

      fetch(`/vinculacion/informes/api?accion=obstaculos&mes=${mes}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setObstaculos(d.obstaculos || []);
        });
    } else if (tab === 'lider') {
      if (!esLider) return;
      setLoading(true);
      fetch(`/vinculacion/informes/api?accion=datos&tipo=lider&ciclo_id=${cicloId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setDatosLider(d.datos);
        })
        .finally(() => setLoading(false));
    } else if (tab === 'historial') {
      setLoading(true);
      fetch('/vinculacion/informes/api?accion=historial')
        .then(r => r.json())
        .then(d => {
          if (d.success) setHistorial(d.historial || []);
        })
        .finally(() => setLoading(false));
    }
  }, [usuario, tab, mes, cicloId, esLider]);

  const agregarObstaculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoObsDesc.trim()) return;
    try {
      const res = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'guardar-obstaculo',
          mes,
          descripcion: nuevoObsDesc,
          impacto: nuevoObsImpacto,
          recomendacion: nuevoObsRecom,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setObstaculos([...obstaculos, d.obstaculo]);
      setNuevoObsDesc('');
      setNuevoObsRecom('');
    } catch (err: any) {
      alert(`Error al guardar obstáculo: ${err.message}`);
    }
  };

  const eliminarObstaculo = async (id: number) => {
    try {
      const res = await fetch(`/vinculacion/informes/api?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setObstaculos(obstaculos.filter(o => o.id !== id));
      }
    } catch (err: any) {
      alert(`Error al eliminar obstáculo: ${err.message}`);
    }
  };

  const generarInforme = async (tipo: 'supervisor' | 'lider') => {
    setGenerando(true);
    setMensaje('');
    try {
      const payloadDatos = tipo === 'supervisor'
        ? { ...datosSupervisor, obstaculos }
        : datosLider;

      const res = await fetch('/vinculacion/informes/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'generar',
          tipo,
          mes: tipo === 'supervisor' ? mes : null,
          ciclo_id: tipo === 'lider' ? cicloId : null,
          datos: payloadDatos,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al generar informe');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_${tipo}_${tipo === 'supervisor' ? mes : 'semestral'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMensaje('¡Informe .docx generado y descargado exitosamente!');
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setGenerando(false);
    }
  };

  const redactarBorradorIA = async (clave: string) => {
    setRedactandoClave(clave);
    try {
      const res = await fetch('/vinculacion/proyecto/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seccion: 'generar_texto',
          clave,
          contexto: datosLider,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);

      setDatosLider((prev: any) => ({
        ...prev,
        textos: {
          ...prev.textos,
          [clave]: d.texto,
        },
      }));
    } catch (err: any) {
      alert(`Error al generar borrador con IA: ${err.message}`);
    } finally {
      setRedactandoClave(null);
    }
  };

  if (loading && !datosSupervisor && !datosLider) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando informes de vinculación...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/portal/dashboard" className="text-blue-600 hover:underline font-medium text-sm">
            &larr; Volver al Portal PINE
          </Link>
          <span className="text-xs bg-blue-100 text-uleam-blue font-bold px-3 py-1 rounded-full">
            Informes Oficiales ULEAM
          </span>
        </div>

        <h1 className="text-3xl font-bold text-uleam-blue mb-2">
          {tab === 'supervisor' ? 'Informe Mensual de Seguimiento (Supervisor)' : tab === 'lider' ? 'Informe Semestral de Avances y Logros (Líder)' : 'Historial de Informes Descargables'}
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Genera el formato oficial en Word (.docx) con indicadores agregados desde la base de datos Neon.
        </p>

        {mensaje && (
          <div className={`p-4 mb-6 rounded-lg font-medium text-sm ${mensaje.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {mensaje}
          </div>
        )}

        {/* Pestañas de navegación */}
        <div className="flex border-b border-gray-300 mb-6 space-x-4">
          {(!tipoQuery || tipoQuery === 'supervisor') && (
            <button
              onClick={() => setTab('supervisor')}
              className={`pb-3 px-2 font-semibold text-sm border-b-2 transition-colors ${tab === 'supervisor' ? 'border-uleam-blue text-uleam-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              📋 Informe Mensual Supervisor
            </button>
          )}
          {esLider && (!tipoQuery || tipoQuery === 'lider') && (
            <button
              onClick={() => setTab('lider')}
              className={`pb-3 px-2 font-semibold text-sm border-b-2 transition-colors ${tab === 'lider' ? 'border-uleam-blue text-uleam-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              📊 Informe Semestral Líder
            </button>
          )}
          <button
            onClick={() => setTab('historial')}
            className={`pb-3 px-2 font-semibold text-sm border-b-2 transition-colors ${tab === 'historial' ? 'border-uleam-blue text-uleam-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            📁 Historial de Descargas
          </button>
        </div>

        {/* CONTENIDO TAB SUPERVISOR */}
        {tab === 'supervisor' && datosSupervisor && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Seleccionar Mes de Informe</label>
                <div className="flex gap-2">
                  <select
                    value={mes.slice(5, 7)}
                    onChange={e => setMes(`${mes.slice(0, 4)}-${e.target.value}`)}
                    className="px-3 py-2 border rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-uleam-blue"
                  >
                    {NOMBRES_MESES.map((nombreMes, indiceMes) => (
                      <option key={nombreMes} value={String(indiceMes + 1).padStart(2, '0')}>{nombreMes}</option>
                    ))}
                  </select>
                  <select
                    value={mes.slice(0, 4)}
                    onChange={e => setMes(`${e.target.value}-${mes.slice(5, 7)}`)}
                    className="px-3 py-2 border rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-uleam-blue"
                  >
                    {ANIOS_DISPONIBLES.map(anio => (
                      <option key={anio} value={anio}>{anio}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => generarInforme('supervisor')}
                disabled={generando}
                className="px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 shadow transition disabled:opacity-50"
              >
                {generando ? 'Generando Documento...' : 'Descargar Informe Mensual .docx'}
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-bold text-uleam-blue mb-4">1. Resumen General del Mes ({datosSupervisor.general?.mes})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-uleam-blue">{datosSupervisor.general?.total_pasantes || 0}</div>
                  <div className="text-xs font-semibold text-gray-600">Pasantes Supervisados</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{datosSupervisor.general?.total_beneficiarios || 0}</div>
                  <div className="text-xs font-semibold text-gray-600">Beneficiarios Atendidos</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-amber-700">{datosSupervisor.general?.total_sesiones || 0}</div>
                  <div className="text-xs font-semibold text-gray-600">Sesiones Aprobadas</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{datosSupervisor.general?.espacios?.length || 0}</div>
                  <div className="text-xs font-semibold text-gray-600">Espacios de Enseñanza</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-bold text-uleam-blue mb-3">2. Tareas y Actividades del Período</h2>
              {datosSupervisor.tareas?.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay registros de sesiones aprobadas para este mes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold border-b">
                        <th className="p-3">Actividad / Espacio</th>
                        <th className="p-3">Sesiones</th>
                        <th className="p-3">Beneficiarios</th>
                        <th className="p-3">Horas Acreditadas</th>
                        <th className="p-3">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosSupervisor.tareas?.map((t: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-semibold text-gray-800">{t.actividad_descripcion}</div>
                            <div className="text-xs text-gray-500">{t.espacio_nombre}</div>
                          </td>
                          <td className="p-3 font-semibold">{t.sesiones_aprobadas}</td>
                          <td className="p-3 font-semibold">{t.beneficiarios_atendidos}</td>
                          <td className="p-3 font-semibold text-blue-700">{t.horas_acreditadas} h</td>
                          <td className="p-3 text-xs text-gray-600">{t.comentarios?.join('; ') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-bold text-uleam-blue mb-3">3. Registro de Obstáculos y Dificultades</h2>
              <form onSubmit={agregarObstaculo} className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Descripción del Obstáculo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Inasistencia por lluvias en sector..."
                      value={nuevoObsDesc}
                      onChange={e => setNuevoObsDesc(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Nivel de Impacto</label>
                    <select
                      value={nuevoObsImpacto}
                      onChange={e => setNuevoObsImpacto(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="bajo">Bajo</option>
                      <option value="medio">Medio</option>
                      <option value="alto">Alto</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Medida Correctiva / Recomendación</label>
                  <input
                    type="text"
                    placeholder="Ej. Reprogramación de clases virtuales..."
                    value={nuevoObsRecom}
                    onChange={e => setNuevoObsRecom(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-uleam-blue text-white text-xs font-bold rounded-lg hover:opacity-90">
                  + Registrar Obstáculo
                </button>
              </form>

              {obstaculos.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay obstáculos registrados para este mes.</p>
              ) : (
                <div className="space-y-2">
                  {obstaculos.map((o: any) => (
                    <div key={o.id} className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center text-sm">
                      <div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${o.impacto === 'alto' ? 'bg-red-100 text-red-700' : o.impacto === 'medio' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}>
                          {o.impacto.toUpperCase()}
                        </span>
                        <span className="font-semibold text-gray-800">{o.descripcion}</span>
                        {o.recomendacion && <p className="text-xs text-gray-600 mt-1">Recomendación: {o.recomendacion}</p>}
                      </div>
                      <button onClick={() => eliminarObstaculo(o.id)} className="text-xs text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTENIDO TAB LÍDER */}
        {tab === 'lider' && esLider && datosLider && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Ciclo Académico del Informe</label>
                <select
                  value={cicloId}
                  onChange={e => setCicloId(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:border-uleam-blue"
                >
                  {ciclos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => generarInforme('lider')}
                disabled={generando}
                className="px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 shadow transition disabled:opacity-50"
              >
                {generando ? 'Generando Documento...' : 'Descargar Informe Semestral .docx'}
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-bold text-uleam-blue mb-4">Resumen de Metas del Ciclo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-uleam-blue">
                    {datosLider.metas?.estudiantes_reales || 0} / {datosLider.metas?.meta_estudiantes || 0}
                  </div>
                  <div className="text-xs font-semibold text-gray-600">Pasantes Participantes</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {datosLider.metas?.beneficiarios_directos_reales || 0} / {datosLider.metas?.meta_beneficiarios_directos || 0}
                  </div>
                  <div className="text-xs font-semibold text-gray-600">Beneficiarios Directos</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {datosLider.metas?.docentes_reales || 0} / {datosLider.metas?.meta_docentes || 0}
                  </div>
                  <div className="text-xs font-semibold text-gray-600">Docentes Tutores</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
              <h2 className="text-lg font-bold text-uleam-blue">Redacción Cualitativa del Informe Semestral</h2>
              {[
                { clave: 'introduccion', titulo: '5.1 Introducción y Contexto' },
                { clave: 'diagnostico', titulo: '5.2 Diagnóstico de la Situación Inicial' },
                { clave: 'resultados_cualitativos', titulo: '5.3 Resultados Cualitativos e Impacto Social' },
                { clave: 'lecciones_aprendidas', titulo: '5.4 Lecciones Aprendidas' },
                { clave: 'conclusiones', titulo: '5.5 Conclusiones' },
                { clave: 'recomendaciones', titulo: '5.6 Recomendaciones' },
              ].map(sec => (
                <div key={sec.clave} className="space-y-2 border-b pb-4">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-gray-800 text-sm">{sec.titulo}</label>
                    <button
                      type="button"
                      onClick={() => redactarBorradorIA(sec.clave)}
                      disabled={redactandoClave === sec.clave}
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-800 font-semibold rounded hover:bg-purple-200 transition disabled:opacity-50"
                    >
                      {redactandoClave === sec.clave ? 'Redactando con IA...' : '✨ Generar borrador con IA'}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={datosLider.textos?.[sec.clave] || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setDatosLider((prev: any) => ({
                        ...prev,
                        textos: { ...prev.textos, [sec.clave]: val },
                      }));
                    }}
                    className="w-full p-3 border rounded-lg text-sm text-gray-800 outline-none focus:border-uleam-blue"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO TAB HISTORIAL */}
        {tab === 'historial' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
            <h2 className="text-lg font-bold text-uleam-blue">Historial de Informes Generados</h2>
            {historial.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Aún no se registran informes generados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold border-b">
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Período / Mes</th>
                      <th className="p-3">Generado Por</th>
                      <th className="p-3">Fecha de Creación</th>
                      <th className="p-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h: any) => (
                      <tr key={h.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${h.tipo === 'supervisor' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {h.tipo.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-semibold">{h.mes ? String(h.mes).slice(0, 7) : h.ciclo_nombre}</td>
                        <td className="p-3 text-xs text-gray-600">
                          {h.supervisor_nombres ? `${h.supervisor_nombres} ${h.supervisor_apellidos}` : 'Líder / Admin'}
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {new Date(h.creado_en).toLocaleString('es-EC')}
                        </td>
                        <td className="p-3">
                          <a
                            href={`/vinculacion/informes/api?accion=descargar&id=${h.id}`}
                            download
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded border"
                          >
                            📥 Descargar .docx
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InformesVinculacionPage() {
  return (
    <Suspense fallback={null}>
      <InformesVinculacionContenido />
    </Suspense>
  );
}
