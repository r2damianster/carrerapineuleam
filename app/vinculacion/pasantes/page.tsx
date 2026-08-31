'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PasantesPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin'].includes(data.usuario.rol) || !data.usuario.modulos_acceso?.includes('vinculacion')) {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
        return fetch('/api/estudiantes').then(r => r.json()).then(d => {
          if (d.success) setEstudiantes(d.data);
        });
      })
      .catch(() => router.push('/login?redirect=/vinculacion/pasantes'));
  }, [router]);

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Administrar Pasantes</h1>
        <p className="text-gray-600 text-sm mb-6">Estudiantes de vinculación registrados y los espacios donde son instructores. Para asignar uno a un espacio nuevo, entra al espacio en <Link href="/vinculacion/espacios" className="text-blue-600 hover:underline">Espacios</Link> → Instructores.</p>

        {estudiantes.length === 0 && <p className="text-gray-400 text-sm">No hay estudiantes registrados todavía.</p>}

        <ul className="space-y-3">
          {estudiantes.map(s => (
            <li key={s.id} className="p-4 border rounded-lg">
              <p className="font-semibold text-gray-800">{s.nombres} {s.apellidos}</p>
              {s.espacios && s.espacios.length > 0 ? (
                <p className="text-sm text-gray-600 mt-1">Instructor en: {s.espacios.map((e: any) => e.nombre).join(', ')}</p>
              ) : (
                <p className="text-sm text-gray-400 mt-1">Sin espacio asignado todavía</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
