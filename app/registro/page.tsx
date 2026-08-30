'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    password: '',
    rol: 'estudiante',
    carrera: '',
    modalidad: '',
    titulo_investigacion: '',
    contacto: '',
    situacion_laboral: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 2. Registrar el usuario en Neon
      const payload = {
        ...formData
      };

      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const registerJson = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerJson.error || 'Error en el registro');
      }

      setMessage('¡Registro completado con éxito!');
      // Redirigir o limpiar formulario
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Registro en el Sistema</h2>
        
        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombres</label>
              <input type="text" name="nombres" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Apellidos</label>
              <input type="text" name="apellidos" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" name="email" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input type="password" name="password" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Rol</label>
            <select name="rol" value={formData.rol} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
              <option value="estudiante">Estudiante Universitario</option>
              <option value="beneficiario">Beneficiario / Participante</option>
              <option value="profesor">Profesor</option>
            </select>
          </div>

          {/* Campos condicionales para Estudiante */}
          {formData.rol === 'estudiante' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-md border">
              <h3 className="text-sm font-semibold text-gray-900">Datos de Estudiante</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Carrera</label>
                <input type="text" name="carrera" onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Modalidad de Vinculación</label>
                <select name="modalidad" onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                  <option value="">Seleccione...</option>
                  <option value="club_ingles">Club de Inglés</option>
                  <option value="podcast">Podcast</option>
                  <option value="investigacion">Investigación</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Título de Investigación (Si aplica)</label>
                <input type="text" name="titulo_investigacion" onChange={handleChange} placeholder="Ej. Prácticas pedagógicas en..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              </div>
            </div>
          )}

          {/* Campos condicionales para Beneficiario */}
          {formData.rol === 'beneficiario' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-md border">
              <h3 className="text-sm font-semibold text-gray-900">Datos de Beneficiario</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contacto (Teléfono)</label>
                <input type="text" name="contacto" onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Situación Laboral Inicial</label>
                <input type="text" name="situacion_laboral" onChange={handleChange} placeholder="Ej. Estudiante de colegio, Empleado, etc." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
}
