'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DifusionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? setCheckingSession(false) : Promise.reject())
      .catch(() => router.push('/login?redirect=/vinculacion/difusion'));
  }, [router]);

  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'podcast',
    fecha: '',
    audiencia_alcanzada: ''
  });

  const [file, setFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage('Error: Es obligatorio subir una evidencia gráfica');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // 1. Subir evidencia a Cloudinary
      const uploadData = new FormData();
      uploadData.append('file', file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData
      });
      
      const uploadJson = await uploadRes.json();
      
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error || 'Error subiendo la evidencia');
      }
      
      const evidencia_url = uploadJson.url;

      // 2. Registrar en base de datos
      const payload = {
        ...formData,
        audiencia_alcanzada: parseInt(formData.audiencia_alcanzada),
        evidencia_url
      };

      const res = await fetch('/api/difusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(`¡Actividad de difusión registrada correctamente!`);
      
      // Reiniciar
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h2 className="text-3xl font-bold text-center text-indigo-900 mb-2">Registro de Difusión</h2>
        <p className="text-center text-gray-600 mb-8">Sube tus podcasts o eventos y reporta la audiencia alcanzada</p>
        
        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Título del Evento / Podcast</label>
              <input type="text" name="titulo" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Difusión</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="podcast">Podcast</option>
                <option value="evento_fisico">Evento Físico</option>
                <option value="encuentro_comunitario">Encuentro Comunitario</option>
                <option value="evento_formacion">Evento de Formación</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input type="date" name="fecha" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Audiencia Alcanzada (N° Personas)</label>
              <input type="number" name="audiencia_alcanzada" min="1" required onChange={handleChange} placeholder="Ej: 150" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
          </div>

          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto / Evidencia del Evento o Podcast</label>
            <input type="file" required accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            <p className="mt-2 text-xs text-gray-500">Obligatorio subir la captura de las métricas del podcast o la foto del evento físico.</p>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Subiendo Evidencia y Registrando...' : 'Registrar Actividad de Difusión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
