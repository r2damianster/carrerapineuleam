'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VinculacionEspaciosPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [usuario, setUsuario] = useState<{ nombres: string; rol: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [ciclos, setCiclos] = useState<any[]>([]);
  const [espacios, setEspacios] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre: '', tipo: 'comunidad', ciclo_id: '' });

  const esProfesor = usuario ? ['profesor', 'admin'].includes(usuario.rol) : false;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin', 'estudiante'].includes(data.usuario.rol)) {
          router.push('/');
          return;
        }
        setUsuario(data.usuario);
        setCheckingSession(false);
        fetchData();
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/espacios'));
  }, [router]);

  const fetchData = async () => {
    const [resCiclos, resEspacios] = await Promise.all([
      fetch('/api/docencia/ciclos'),
      fetch('/api/espacios?area=vinculacion'),
    ]);
    const [dataCiclos, dataEspacios] = await Promise.all([resCiclos.json(), resEspacios.json()]);
    if (dataCiclos.success) setCiclos(dataCiclos.data);
    if (dataEspacios.success) setEspacios(dataEspacios.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/espacios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, area: 'vinculacion' }),
      });
      if (!res.ok) throw new Error('Error creando espacio');
      setMessage('Espacio creado');
      setForm({ nombre: '', tipo: 'comunidad', ciclo_id: '' });
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
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Gestionar Vinculación</h1>
          {usuario && <span className="text-sm text-gray-600">{usuario.nombres}</span>}
        </div>

        {message && <div className="p-4 mb-4 bg-blue-100 text-blue-800 rounded">{message}</div>}

        {esProfesor && (
          <form onSubmit={handleCreate} className="space-y-4 border p-4 rounded bg-gray-50 mb-8">
            <h3 className="font-bold text-lg">Nuevo Espacio de Vinculación</h3>
            <input required placeholder="Nombre (Ej. Club de Inglés A)" className="w-full border p-2 rounded" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            <select required className="w-full border p-2 rounded" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              <option value="comunidad">Encuentro Comunitario / Club</option>
              <option value="aula">Aula Virtual/Física</option>
            </select>
            <select required className="w-full border p-2 rounded" value={form.ciclo_id} onChange={e => setForm({ ...form, ciclo_id: e.target.value })}>
              <option value="">Selecciona Ciclo</option>
              {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">Crear Espacio</button>
          </form>
        )}

        <h3 className="font-bold text-lg mb-2">{esProfesor ? 'Espacios Actuales' : 'Tus Espacios'}</h3>
        {espacios.length === 0 && <p className="text-gray-500 text-sm">Todavía no hay espacios.</p>}
        <ul className="space-y-2">
          {espacios.map(e => (
            <li key={e.id}>
              <Link href={`/vinculacion/espacios/${e.id}`} className="block p-3 border rounded shadow-sm hover:bg-gray-50">
                <strong>{e.nombre}</strong> ({e.tipo === 'comunidad' ? 'club' : 'aula'}) - Ciclo: {e.ciclo_nombre} <br />
                <span className="text-sm text-gray-500">{e.inscritos} beneficiarios inscritos</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
