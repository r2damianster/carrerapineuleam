'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EspacioInstructoresPage() {
  const router = useRouter();
  const params = useParams();
  const espacioId = parseInt(params.id as string);

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [instructoresActuales, setInstructoresActuales] = useState<any[]>([]);
  const [selectedInstructores, setSelectedInstructores] = useState<number[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin'].includes(data.usuario.rol)) {
          router.push('/vinculacion/espacios');
          return;
        }
        setCheckingSession(false);
        return fetchData();
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/espacios'));
  }, [router, espacioId]);

  const fetchData = async () => {
    const [resEstudiantes, resInstructores] = await Promise.all([
      fetch('/api/estudiantes'),
      fetch(`/api/espacios/instructores?espacio_id=${espacioId}`),
    ]);
    const [dataEstudiantes, dataInstructores] = await Promise.all([resEstudiantes.json(), resInstructores.json()]);
    if (dataEstudiantes.success) setEstudiantes(dataEstudiantes.data);
    if (dataInstructores.success) setInstructoresActuales(dataInstructores.data);
  };

  const handleAsignarInstructores = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/espacios/instructores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espacio_id: espacioId, estudiantes_ids: selectedInstructores }),
      });
      if (!res.ok) throw new Error('Error asignando instructores');
      setMessage('Instructores asignados correctamente');
      setSelectedInstructores([]);
      fetchData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="mb-4">
          <Link href="/vinculacion/espacios" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver a Espacios
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Asignar Estudiantes Instructores</h1>

        {message && <div className="p-4 mb-4 bg-blue-100 text-blue-800 rounded">{message}</div>}

        <form onSubmit={handleAsignarInstructores} className="space-y-4">
          <div className="border p-4 rounded h-64 overflow-y-auto">
            {estudiantes.length === 0 && <p className="text-gray-400 text-sm">No hay estudiantes registrados todavía.</p>}
            {estudiantes.map(s => (
              <label key={s.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100">
                <input type="checkbox" checked={selectedInstructores.includes(s.id)} onChange={(e) => {
                  if (e.target.checked) setSelectedInstructores([...selectedInstructores, s.id]);
                  else setSelectedInstructores(selectedInstructores.filter(id => id !== s.id));
                }} />
                <span>{s.nombres} {s.apellidos}</span>
              </label>
            ))}
          </div>
          <button disabled={loading || selectedInstructores.length === 0} className="w-full bg-blue-600 text-white p-2 rounded">Asignar Seleccionados</button>

          <h4 className="font-semibold mt-6">Instructores actuales</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {instructoresActuales.map(i => <li key={i.id}>{i.nombres} {i.apellidos}</li>)}
            {instructoresActuales.length === 0 && <li className="text-gray-400">Ninguno todavía</li>}
          </ul>
        </form>
      </div>
    </div>
  );
}
