'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';

interface Franja {
  id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

interface DocenteHorario {
  usuario_id: number;
  nombre: string;
  franjas: Franja[];
}

export default function TutoringScheduleSection() {
  const [docentes, setDocentes] = useState<DocenteHorario[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const s = t.tutoringSchedule;

  useEffect(() => {
    const loadHorarios = async () => {
      try {
        const res = await fetch('/api/docentes/horario-tutorias');
        if (!res.ok) throw new Error('Failed to fetch tutoring schedule');
        setDocentes(await res.json());
      } catch {
        setDocentes([]);
      } finally {
        setLoading(false);
      }
    };
    loadHorarios();
  }, []);

  if (loading || docentes.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-uleam-blue">{s.title}</h2>
          <p className="text-gray-600 mt-2">{s.subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {docentes.map((docente) => (
            <div key={docente.usuario_id} className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-uleam-blue mb-3">{docente.nombre}</h3>
              <ul className="space-y-1">
                {docente.franjas.map((franja) => (
                  <li key={franja.id} className="text-sm text-gray-700 flex justify-between">
                    <span className="font-medium">{s.days[franja.dia_semana as keyof typeof s.days] || franja.dia_semana}</span>
                    <span>{franja.hora_inicio.slice(0, 5)} - {franja.hora_fin.slice(0, 5)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
