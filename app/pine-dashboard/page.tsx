'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PineDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodos, setPeriodos] = useState<{ id: number; nombre: string }[]>([]);
  const [periodoId, setPeriodoId] = useState(''); // '' = acumulado de todo el proyecto

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin'].includes(data.usuario.rol)) {
          router.push('/');
          return;
        }
        return fetch(`/api/admin/stats${periodoId ? `?periodo_id=${periodoId}` : ''}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setStats(data.data);
              setPeriodos(data.periodos || []);
            }
            setLoading(false);
          });
      })
      .catch(() => router.push('/portal/login?redirect=/pine-dashboard'));
  }, [router, periodoId]);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando indicadores...</div>;
  if (!stats) return <div className="p-8 text-center text-red-500">Error cargando dashboard</div>;

  const pctDiagnostico = stats.totalInscritos > 0
    ? Math.min(Math.round((stats.evaluacionesIniciales / stats.totalInscritos) * 100), 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Indicadores PINE</h1>
        <p className="text-sm text-gray-600 mb-4">Seguimiento de metas del proyecto en Vinculación e Investigación en tiempo real.</p>

        <div className="mb-8 flex items-center gap-3">
          <label htmlFor="periodo" className="text-sm font-medium text-gray-700">Período académico</label>
          <select
            id="periodo"
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
          >
            <option value="">Todos (acumulado del proyecto)</option>
            {periodos.map(periodo => <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>)}
          </select>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-4">Vinculación con la Sociedad — Semestre & Meta Global</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Tarjeta 1A: Semestre Actual - Pre-Test Diagnóstico */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-500">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded">Semestre Actual</span>
            <h3 className="text-lg font-semibold text-gray-800 mt-2">Diagnóstico MCER (Pre-Test)</h3>
            <p className="text-4xl font-bold text-emerald-600 my-2">{stats.evaluacionesIniciales} / {stats.totalInscritos}</p>
            <p className="text-sm text-gray-500">Beneficiarios evaluados en test inicial respecto a inscritos.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${pctDiagnostico}%` }}></div>
            </div>
          </div>

          {/* Tarjeta 1B: Meta Proyecto - Evaluaciones Finales */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded">Meta Proyecto (2 Años)</span>
            <h3 className="text-lg font-semibold text-gray-800 mt-2">Evaluaciones Finales (Post-Test)</h3>
            <p className="text-4xl font-bold text-blue-600 my-2">{stats.evaluacionesFinales} / 100</p>
            <p className="text-sm text-gray-500">Participantes que han culminado su evaluación final al cierre de ciclo.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min((stats.evaluacionesFinales / 100) * 100, 100)}%` }}></div>
            </div>
          </div>

          {/* Tarjeta 2: Beneficiarios Inscritos & Atendidos */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-teal-500">
            <h3 className="text-lg font-semibold text-gray-800">Beneficiarios Inscritos</h3>
            <p className="text-4xl font-bold text-teal-600 my-2">{stats.totalInscritos} / {stats.totalBeneficiarios}</p>
            <p className="text-sm text-gray-500">Beneficiarios asignados activamente a espacios de enseñanza.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-teal-600 h-2.5 rounded-full" style={{ width: `${stats.totalBeneficiarios > 0 ? Math.min((stats.totalInscritos / stats.totalBeneficiarios) * 100, 100) : 0}%` }}></div>
            </div>
          </div>

          {/* Tarjeta 3: Horas Acreditadas */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-sky-500">
            <h3 className="text-lg font-semibold text-gray-800">Horas Acreditadas</h3>
            <p className="text-4xl font-bold text-sky-600 my-2">{stats.horasTotalesAcreditadas} <span className="text-lg font-normal text-gray-500">hrs</span></p>
            <p className="text-sm text-gray-500">Total acumulado en docencia, podcasts e investigación.</p>
          </div>

          {/* Tarjeta 4: Satisfacción Promedio */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-yellow-500">
            <h3 className="text-lg font-semibold text-gray-800">Satisfacción Promedio</h3>
            <p className="text-4xl font-bold text-yellow-500 my-2">⭐ {stats.satisfaccionPromedio}</p>
            <p className="text-sm text-gray-500">De 5.0 máximo. (Basado en {stats.totalEncuestas} encuestas).</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${(parseFloat(stats.satisfaccionPromedio) / 5) * 100}%` }}></div>
            </div>
          </div>

          {/* Tarjeta 5: Audiencia de Difusión */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-purple-500">
            <h3 className="text-lg font-semibold text-gray-800">Audiencia de Difusión</h3>
            <p className="text-4xl font-bold text-purple-600 my-2">{stats.audiencia} / 50</p>
            <p className="text-sm text-gray-500">Meta semestral de alcance en podcasts y eventos.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${Math.min((stats.audiencia / 50) * 100, 100)}%` }}></div>
            </div>
          </div>

          {/* Tarjeta 6: Investigadores Vinculados */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500">
            <h3 className="text-lg font-semibold text-gray-800">Investigadores Vinculados</h3>
            <p className="text-4xl font-bold text-indigo-600 my-2">{stats.investigadores} / 6</p>
            <p className="text-sm text-gray-500">Estudiantes vinculados a procesos de investigación.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min((stats.investigadores / 6) * 100, 100)}%` }}></div>
            </div>
          </div>

        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-4 mt-10">Investigación — Contribuciones Académicas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-pink-500">
            <h3 className="text-lg font-semibold text-gray-700">Artículos Regionales</h3>
            <p className="text-4xl font-bold text-pink-600 my-2">{stats.contribuciones.articulosRegionales}</p>
            <p className="text-sm text-gray-500">Indexados en Latindex, Dialnet, etc.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-red-500">
            <h3 className="text-lg font-semibold text-gray-700">Artículos de Alto Impacto</h3>
            <p className="text-4xl font-bold text-red-600 my-2">{stats.contribuciones.articulosAltoImpacto}</p>
            <p className="text-sm text-gray-500">Indexados en ErihPlus, Scopus, WoS, etc.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-orange-500">
            <h3 className="text-lg font-semibold text-gray-700">Libros</h3>
            <p className="text-4xl font-bold text-orange-600 my-2">{stats.contribuciones.libros}</p>
            <p className="text-sm text-gray-500">Libros publicados por docentes de la carrera.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-amber-500">
            <h3 className="text-lg font-semibold text-gray-700">Capítulos de Libro</h3>
            <p className="text-4xl font-bold text-amber-600 my-2">{stats.contribuciones.capitulosLibro}</p>
            <p className="text-sm text-gray-500">Capítulos publicados en obras colectivas.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-teal-500">
            <h3 className="text-lg font-semibold text-gray-700">Memorias de Evento</h3>
            <p className="text-4xl font-bold text-teal-600 my-2">{stats.contribuciones.memoriasEvento}</p>
            <p className="text-sm text-gray-500">Ponencias y memorias de congresos/eventos.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-cyan-500">
            <h3 className="text-lg font-semibold text-gray-700">Propiedad Intelectual</h3>
            <p className="text-4xl font-bold text-cyan-600 my-2">{stats.contribuciones.propiedadIntelectual}</p>
            <p className="text-sm text-gray-500">Registros de propiedad intelectual.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-gray-700 md:col-span-2 lg:col-span-3">
            <h3 className="text-lg font-semibold text-gray-700">Total de Contribuciones Registradas</h3>
            <p className="text-4xl font-bold text-gray-800 my-2">{stats.contribuciones.total}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
