'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Espacio {
  id: number;
  nombre: string;
  area: string;
}

interface Avance {
  espacios: Espacio[];
  beneficiarios: number;
  asistenciasRegistradas: number;
  evaluacionesMcer: number;
  encuestasEnTuEspacio: number;
  difusion: { aprobadas: number; pendientes: number; podcasts: number };
  horasPodcast: { total: number; episodios: number; pendientes: number; episodiosPendientes: number };
  horasInvestigacion: { total: number; reportes: number } | null;
}

function Tile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-white p-5 rounded-xl shadow-md border-t-4 ${color}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function MiAvancePage() {
  const [avance, setAvance] = useState<Avance | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/mi-avance')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('No se pudo cargar tu avance'))))
      .then(setAvance)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Mi Avance</h1>
            <p className="text-gray-600 mt-2">Resumen de tus registros en Vinculación, aunque todavía no hayas registrado nada.</p>
            <Link href="/portal/dashboard" className="text-sm text-gray-500 hover:underline">« Volver al Portal</Link>
          </div>

          {error && <p className="text-red-600 mb-4">{error}</p>}

          {!avance && !error && <p className="text-gray-500">Cargando...</p>}

          {avance && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Tus espacios asignados</h2>
                {avance.espacios.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-white p-4 rounded-xl border border-dashed border-gray-300">
                    Todavía no estás asignado como instructor en ningún espacio. El profesor a cargo de Vinculación debe asignarte primero.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {avance.espacios.map((e) => (
                      <div key={e.id} className="bg-white p-4 rounded-xl border border-gray-200">
                        <p className="font-medium text-gray-800">{e.nombre}</p>
                        <p className="text-xs text-gray-500 capitalize">{e.area}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Horas acreditables</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Tile
                    label="🎙 Horas de Podcast"
                    value={`${avance.horasPodcast.total} h`}
                    sub={`${avance.horasPodcast.episodios} episodio(s) aprobado(s)`}
                    color="border-amber-500"
                  />
                  {avance.horasPodcast.episodiosPendientes > 0 && (
                    <Tile
                      label="⏳ Horas pendientes de aprobación"
                      value={`${avance.horasPodcast.pendientes} h`}
                      sub={`${avance.horasPodcast.episodiosPendientes} episodio(s) esperando que el profesor los apruebe en el sitio`}
                      color="border-orange-400"
                    />
                  )}
                  {avance.horasInvestigacion && (
                    <Tile
                      label="🔬 Horas de Investigación"
                      value={`${avance.horasInvestigacion.total} h`}
                      sub={`${avance.horasInvestigacion.reportes} reporte(s)`}
                      color="border-emerald-500"
                    />
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Tu espacio de Vinculación</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Tile label="Beneficiarios" value={avance.beneficiarios} sub="inscritos en tu(s) espacio(s)" color="border-blue-500" />
                  <Tile label="Asistencias registradas" value={avance.asistenciasRegistradas} sub="por ti" color="border-blue-500" />
                  <Tile label="Evaluaciones MCER" value={avance.evaluacionesMcer} sub="realizadas por ti" color="border-blue-500" />
                  <Tile label="Encuestas de satisfacción" value={avance.encuestasEnTuEspacio} sub="en tu(s) espacio(s)" color="border-blue-500" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Difusión y podcasts registrados</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Tile label="Publicados en el sitio" value={avance.difusion.aprobadas} color="border-purple-500" />
                  <Tile label="Pendientes de aprobación" value={avance.difusion.pendientes} color="border-purple-500" />
                  <Tile label="De ellos, podcasts" value={avance.difusion.podcasts} color="border-purple-500" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/vinculacion/asistencia" className="text-blue-600 hover:underline text-sm">» Registrar Asistencia</Link>
                <Link href="/vinculacion/beneficiarios" className="text-blue-600 hover:underline text-sm">» Registrar Beneficiarios</Link>
                <Link href="/vinculacion/test-mcer" className="text-blue-600 hover:underline text-sm">» Test MCER</Link>
                <Link href="/vinculacion/encuesta" className="text-blue-600 hover:underline text-sm">» Encuesta</Link>
                <Link href="/vinculacion/difusion" className="text-blue-600 hover:underline text-sm">» Difusión / Evento</Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
