'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mcerQuestions } from '@/lib/questions';

export default function TestMcerPage() {
  const router = useRouter();
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // En un sistema real, este ID viene de la sesión del estudiante (JWT, NextAuth, etc.)
  // Por ahora lo simularemos con un input para no bloquearnos sin sistema de login
  const [estudianteId, setEstudianteId] = useState('');

  const [formData, setFormData] = useState({
    beneficiario_id: '',
    tipo: 'inicial',
  });

  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    // Fetch beneficiarios
    fetch('/api/beneficiarios')
      .then(res => res.json())
      .then(data => {
        if (data.success) setBeneficiarios(data.data);
      })
      .catch(err => console.error("Error loading beneficiarios:", err));
  }, []);

  const [file, setFile] = useState<File | null>(null);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const calculateLevel = (score: number) => {
    if (score <= 5) return 'A1';
    if (score <= 10) return 'A2';
    if (score <= 15) return 'B1';
    return 'B2';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudianteId) {
      setMessage('Error: Ingresa tu ID de estudiante evaluador (simulación)');
      return;
    }
    if (!formData.beneficiario_id) {
      setMessage('Error: Selecciona un beneficiario');
      return;
    }
    if (Object.keys(answers).length < mcerQuestions.length) {
      setMessage('Error: Debes responder todas las preguntas');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      let evidencia_url = '';

      if (file) {
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
        
        evidencia_url = uploadJson.url;
      }

      // Calcular puntaje
      let score = 0;
      mcerQuestions.forEach(q => {
        if (answers[q.id] === q.correct) {
          score += 1;
        }
      });

      const level = calculateLevel(score);

      const payload = {
        beneficiario_id: parseInt(formData.beneficiario_id),
        estudiante_evaluador_id: parseInt(estudianteId),
        tipo: formData.tipo,
        puntaje_obtenido: score,
        nivel_asignado: level,
        respuestas_json: answers,
        evidencia_url
      };

      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(`¡Test registrado! Puntaje: ${score}/20. Nivel asignado: ${level}`);
      window.scrollTo(0, 0);
      
      // Reiniciar
      setTimeout(() => {
        router.push('/');
      }, 3000);
      
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-2">Test de Nivelación MCER</h2>
        <div className="flex flex-col md:flex-row items-center justify-between mb-8">
          <p className="text-gray-600">Aplicado por estudiantes a beneficiarios del programa</p>
          <a 
            href="/api/tests/download-docx" 
            target="_blank"
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            📄 Descargar Test en Word
          </a>
        </div>
        
        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-bold text-blue-900">Tu ID de Estudiante</label>
              <input type="number" required value={estudianteId} onChange={(e) => setEstudianteId(e.target.value)} placeholder="Ej: 1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-bold text-blue-900">Beneficiario Evaluado</label>
              <select name="beneficiario_id" required value={formData.beneficiario_id} onChange={handleSelectChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="">Seleccione...</option>
                {beneficiarios.map(b => (
                  <option key={b.id} value={b.id}>{b.nombres} {b.apellidos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-blue-900">Momento del Test</label>
              <select name="tipo" value={formData.tipo} onChange={handleSelectChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="inicial">Pre-Test (Inicial)</option>
                <option value="final">Post-Test (Final)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-blue-900">Foto / Evidencia Física</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" />
            </div>
          </div>

          <div className="space-y-6">
            {mcerQuestions.map((q, index) => (
              <div key={q.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <p className="font-medium text-gray-900 mb-3">
                  <span className="text-blue-600 mr-2">{index + 1}.</span> {q.text} 
                  <span className="text-xs text-gray-400 ml-2">({q.level})</span>
                </p>
                <div className="space-y-2 pl-6">
                  {Object.entries(q.options).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`question_${q.id}`} 
                        value={key} 
                        onChange={() => handleAnswerChange(q.id, key)}
                        checked={answers[q.id] === key}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        required
                      />
                      <span className="text-gray-700">{value}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto md:px-12 mx-auto flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Calculando Resultados...' : 'Enviar y Evaluar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
