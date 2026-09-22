'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PasanteAnalitica {
  pasante_id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  espacio_nombre: string;
  espacio_id: number;
  horas_asistencia: number;
  asistencias_pendientes: number;
  horas_podcast: number;
  horas_investigacion: number;
  horas_totales: number;
  beneficiarios_a_cargo: number;
  pre_tests_count: number;
  post_tests_count: number;
  promedio_satisfaccion: number;
}

interface McerImpacto {
  nivel_inicial: string;
  nivel_final: string;
  total_beneficiarios: number;
  nota_pre_promedio: number;
  nota_post_promedio: number;
  ganancia_promedio: number;
}

interface AsistenciaUrgente {
  id: number;
  fecha: string;
  espacio_nombre: string;
  registrador_nombres: string;
  registrador_apellidos: string;
}

interface DataIndicadores {
  pasantesAnalitica: PasanteAnalitica[];
  mcerImpacto: McerImpacto[];
  mcerGlobal: {
    total_evaluados: number;
    total_pre: number;
    total_post: number;
    prom_pre: number;
    prom_post: number;
  };
  asistenciasUrgentes: AsistenciaUrgente[];
  encuestasConsolidado: {
    total_encuestas: number;
    satisfaccion_general: number;
    percepcion_aprendizaje: number;
    recomienda_curso: number;
  };
  metaHorasLegal: number;
}

export default function IndicadoresSupervisionPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DataIndicadores | null>(null);
  const [activeTab, setActiveTab] = useState<'supervisados' | 'mcer' | 'alertas'>('supervisados');
  const [searchTerm, setSearchTerm] = useState('');
  const [espacioFilter, setEspacioFilter] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((resData) => {
        if (!['profesor', 'admin'].includes(resData.usuario.rol)) {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/supervisar/indicadores'));
  }, [router]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vinculacion/supervisores/indicadores');
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checkingSession) cargar();
  }, [checkingSession, cargar]);

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Verificando sesión...</div>;
  }

  const pasantesFiltrados = (data?.pasantesAnalitica || []).filter((p) => {
    const matchNombre = `${p.nombres} ${p.apellidos} ${p.cedula}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEspacio = !espacioFilter || p.espacio_id.toString() === espacioFilter;
    return matchNombre && matchEspacio;
  });

  const espaciosUnicos = Array.from(
    new Map((data?.pasantesAnalitica || []).map((p) => [p.espacio_id, p.espacio_nombre])).entries()
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Navbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
          <div>
            <Link href="/vinculacion/supervisar" className="text-xs text-blue-400 hover:underline font-semibold block mb-1">
              &larr; Volver a Aprobación de Asistencias
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              📊 Indicadores & Analítica de Supervisión
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Seguimiento pedagógico de pasantes supervisados, impacto MCER e informes ejecutivos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/vinculacion/supervisar" className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition-colors">
              📋 Aprobar Asistencias ({data?.asistenciasUrgentes.length || 0})
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white rounded-xl shadow-sm overflow-x-auto text-sm font-medium">
          <button
            onClick={() => setActiveTab('supervisados')}
            className={`py-3.5 px-6 border-b-2 font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'supervisados' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👨‍🏫 Supervisión por Pasante ({data?.pasantesAnalitica.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('mcer')}
            className={`py-3.5 px-6 border-b-2 font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'mcer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📈 Avances MCER & Impacto Pedagógico</span>
          </button>
          <button
            onClick={() => setActiveTab('alertas')}
            className={`py-3.5 px-6 border-b-2 font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'alertas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🚨 Semáforo & Alertas de Sistema</span>
          </button>
        </div>

        {loading && <div className="py-12 text-center text-slate-500 text-sm">Cargando indicadores analíticos...</div>}

        {!loading && data && (
          <div className="space-y-6">

            {/* TAB 1: SUPERVISIÓN POR ESTUDIANTE / PASANTE */}
            {activeTab === 'supervisados' && (
              <div className="space-y-6">

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Pasantes Supervisados</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{data.pasantesAnalitica.length} Estudiantes</div>
                    <div className="text-xs text-blue-600 mt-1">En {espaciosUnicos.length} Espacios de Vinculación</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Evaluados con Pre-Test</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">{data.mcerGlobal.total_pre} Beneficiarios</div>
                    <div className="text-xs text-slate-400 mt-1">Puntaje prom: {data.mcerGlobal.prom_pre} pts</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Evaluados con Post-Test</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{data.mcerGlobal.total_post} Beneficiarios</div>
                    <div className="text-xs text-slate-400 mt-1">Puntaje prom: {data.mcerGlobal.prom_post} pts</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Satisfacción Promedio</div>
                    <div className="text-2xl font-bold text-amber-500 mt-1">★ {data.encuestasConsolidado.satisfaccion_general} / 5.0</div>
                    <div className="text-xs text-slate-400 mt-1">Basado en {data.encuestasConsolidado.total_encuestas} encuestas</div>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="Buscar por nombre, apellido o cédula..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-xs rounded-lg px-3 py-2 w-full sm:w-64 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={espacioFilter}
                      onChange={(e) => setEspacioFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-xs rounded-lg px-3 py-2 w-full sm:w-auto outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos los Espacios de Enseñanza</option>
                      {espaciosUnicos.map(([id, nombre]) => (
                        <option key={id} value={id}>
                          {nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-slate-500">
                    Mostrando <strong>{pasantesFiltrados.length} pasantes</strong>
                  </div>
                </div>

                {/* Pasantes Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Estudiante (Pasante)</th>
                          <th className="p-3.5">Espacio Asignado</th>
                          <th className="p-3.5 text-center">Horas Aprobadas</th>
                          <th className="p-3.5 text-center">Beneficiarios</th>
                          <th className="p-3.5 text-center">Pre / Post Tests</th>
                          <th className="p-3.5 text-center">Satisfacción</th>
                          <th className="p-3.5 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {pasantesFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400">
                              No hay estudiantes supervisados para este filtro.
                            </td>
                          </tr>
                        ) : (
                          pasantesFiltrados.map((p) => {
                            const pctMeta = Math.min(100, Math.round((p.horas_totales / data.metaHorasLegal) * 100));

                            return (
                              <tr key={p.pasante_id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3.5 font-semibold text-slate-900">
                                  <div className="text-sm">{p.apellidos} {p.nombres}</div>
                                  <div className="text-[11px] text-slate-400 font-normal">CI: {p.cedula}</div>
                                </td>
                                <td className="p-3.5">
                                  <span className="inline-block bg-blue-50 text-blue-700 px-2.5 py-1 rounded font-medium border border-blue-100">
                                    {p.espacio_nombre}
                                  </span>
                                </td>
                                <td className="p-3.5 text-center">
                                  <div className="font-bold text-slate-900">{p.horas_totales}h / {data.metaHorasLegal}h</div>
                                  <div className="w-24 bg-slate-200 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full ${pctMeta >= 80 ? 'bg-emerald-500' : pctMeta >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                      style={{ width: `${pctMeta}%` }}
                                    ></div>
                                  </div>
                                </td>
                                <td className="p-3.5 text-center font-semibold text-slate-800">
                                  {p.beneficiarios_a_cargo} alumnos
                                </td>
                                <td className="p-3.5 text-center font-mono">
                                  <span className="text-emerald-600 font-bold">{p.pre_tests_count} Pre</span> /{' '}
                                  <span className="text-blue-600 font-bold">{p.post_tests_count} Post</span>
                                </td>
                                <td className="p-3.5 text-center">
                                  <span className="text-amber-500 font-bold">★ {Math.round(p.promedio_satisfaccion * 10) / 10}</span>
                                </td>
                                <td className="p-3.5 text-center">
                                  {p.asistencias_pendientes > 0 ? (
                                    <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
                                      {p.asistencias_pendientes} Pendientes
                                    </span>
                                  ) : pctMeta >= 75 ? (
                                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
                                      Al Día
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
                                      En Progreso
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MATRIZ DE IMPACTO MCER */}
            {activeTab === 'mcer' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900">📈 Matriz de Transición Nivel MCER (Pre vs Post)</h3>
                    <p className="text-xs text-slate-500">Métricas comparativas entre el diagnóstico inicial y la evaluación final de los beneficiarios comunitarios.</p>
                  </div>

                  {data.mcerImpacto.length === 0 ? (
                    <p className="text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl text-xs">
                      Aún no existen beneficiarios que hayan completado tanto el Pre-Test como el Post-Test.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase">
                          <tr>
                            <th className="p-3">Nivel Diagnóstico (Pre)</th>
                            <th className="p-3">Nivel Alcanzado (Post)</th>
                            <th className="p-3 text-center">Beneficiarios</th>
                            <th className="p-3 text-center">Nota Pre Prom.</th>
                            <th className="p-3 text-center">Nota Post Prom.</th>
                            <th className="p-3 text-center">Ganancia (Delta)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.mcerImpacto.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-semibold text-slate-700">{row.nivel_inicial}</td>
                              <td className="p-3 font-semibold text-emerald-700">{row.nivel_final}</td>
                              <td className="p-3 text-center font-bold text-slate-900">{row.total_beneficiarios}</td>
                              <td className="p-3 text-center text-slate-600">{row.nota_pre_promedio} pts</td>
                              <td className="p-3 text-center text-blue-600 font-bold">{row.nota_post_promedio} pts</td>
                              <td className="p-3 text-center font-bold text-emerald-600">+{row.ganancia_promedio} pts 🚀</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ALERTAS DE SISTEMA */}
            {activeTab === 'alertas' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900">🚨 Semáforo de Riesgo y Aprobaciones Urgentes</h3>
                    <p className="text-xs text-slate-500">Registros de asistencia enviados por pasantes que aguardan supervisión docente.</p>
                  </div>

                  {data.asistenciasUrgentes.length === 0 ? (
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold">
                      ✓ ¡Excelente! No hay asistencias pendientes de revisión en este momento.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.asistenciasUrgentes.map((a) => (
                        <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{a.espacio_nombre}</div>
                            <div className="text-[11px] text-slate-600">
                              Registrado por: <strong>{a.registrador_nombres} {a.registrador_apellidos}</strong> • Fecha: {a.fecha}
                            </div>
                          </div>
                          <Link href="/vinculacion/supervisar" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                            Aprobar / Rechazar &rarr;
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

