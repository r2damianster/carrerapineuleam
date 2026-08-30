'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EncuestaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    beneficiario_id: '',
    ciclo_id: '',
    nivel_satisfaccion: 5,
    comentarios: ''
  });

  useEffect(() => {
    // Fetch ciclos y beneficiarios
    Promise.all([
      fetch('/api/docencia/ciclos').then(r => r.json()),
      fetch('/api/beneficiarios').then(r => r.json())
    ]).then(([ciclosData, benData]) => {
      if (ciclosData.success) setCiclos(ciclosData.data);
      if (benData.success) setBeneficiarios(benData.data);
    }).catch(err => console.error(err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRating = (rating: number) => {
    setFormData({ ...formData, nivel_satisfaccion: rating });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.beneficiario_id || !formData.ciclo_id) {
      setMessage('Error: Por favor selecciona tu usuario y el ciclo a evaluar.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const payload = {
        beneficiario_id: parseInt(formData.beneficiario_id),
        ciclo_id: parseInt(formData.ciclo_id),
        nivel_satisfaccion: formData.nivel_satisfaccion,
        comentarios: formData.comentarios
      };

      const res = await fetch('/api/encuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(`¡Gracias por tus comentarios! Encuesta registrada.`);
      
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md border-t-4 border-yellow-400">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Encuesta de Satisfacción</h2>
        <p className="text-center text-gray-600 mb-8">Tu opinión nos ayuda a mejorar el programa de inglés.</p>
        
        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700">Tu Perfil (Simulado)</label>
              <select name="beneficiario_id" required value={formData.beneficiario_id} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="">Selecciona tu nombre...</option>
                {beneficiarios.map(b => (
                  <option key={b.id} value={b.id}>{b.nombres} {b.apellidos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">Ciclo / Semestre a evaluar</label>
              <select name="ciclo_id" required value={formData.ciclo_id} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="">Selecciona el ciclo...</option>
                {ciclos.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t">
            <label className="block text-lg font-bold text-gray-800 mb-4 text-center">
              ¿Qué tan satisfecho estás con el programa?
            </label>
            <div className="flex justify-center space-x-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRating(star)}
                  className={`text-4xl focus:outline-none transition-colors ${
                    star <= formData.nivel_satisfaccion ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              {formData.nivel_satisfaccion} de 5 estrellas
            </p>
          </div>

          <div className="pt-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Comentarios adicionales (Opcional)</label>
            <textarea
              name="comentarios"
              rows={4}
              value={formData.comentarios}
              onChange={handleChange}
              placeholder="¿Qué te gustó más? ¿Qué podemos mejorar?"
              className="block w-full rounded-md border-gray-300 shadow-sm p-3 border"
            ></textarea>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Encuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
