'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PineDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin'].includes(data.usuario.rol)) {
          router.push('/');
          return;
        }
        return fetch('/api/admin/stats')
          .then(res => res.json())
          .then(data => {
            if (data.success) setStats(data.data);
            setLoading(false);
          });
      })
      .catch(() => router.push('/login?redirect=/pine-dashboard'));
  }, [router]);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando indicadores...</div>;
  if (!stats) return <div className="p-8 text-center text-red-500">Error cargando dashboard</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard de Indicadores PINE</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Tarjeta 1: Propósito - Nivel Inglés */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-700">Mejora de Nivel MCER</h3>
            <p className="text-4xl font-bold text-blue-600 my-2">{stats.evaluacionesFinales} / 100</p>
            <p className="text-sm text-gray-500">Participantes que han culminado su evaluación final.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min((stats.evaluacionesFinales / 100) * 100, 100)}%` }}></div>
            </div>
          </div>

          {/* Tarjeta 3: Calidad - Encuestas */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-yellow-500">
            <h3 className="text-lg font-semibold text-gray-700">Satisfacción Promedio</h3>
            <p className="text-4xl font-bold text-yellow-500 my-2">⭐ {stats.satisfaccionPromedio}</p>
            <p className="text-sm text-gray-500">De 5.0 máximo. (Basado en {stats.totalEncuestas} encuestas).</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${(parseFloat(stats.satisfaccionPromedio) / 5) * 100}%` }}></div>
            </div>
          </div>

          {/* Tarjeta 4: Difusión - Audiencia */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-purple-500">
            <h3 className="text-lg font-semibold text-gray-700">Audiencia de Difusión</h3>
            <p className="text-4xl font-bold text-purple-600 my-2">{stats.audiencia} / 50</p>
            <p className="text-sm text-gray-500">Meta semestral de alcance en podcasts y eventos.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${Math.min((stats.audiencia / 50) * 100, 100)}%` }}></div>
            </div>
          </div>

          {/* Tarjeta 5: Investigación */}
          <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500">
            <h3 className="text-lg font-semibold text-gray-700">Investigadores Vinculados</h3>
            <p className="text-4xl font-bold text-indigo-600 my-2">{stats.investigadores} / 6</p>
            <p className="text-sm text-gray-500">Estudiantes vinculados a procesos de investigación.</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min((stats.investigadores / 6) * 100, 100)}%` }}></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
