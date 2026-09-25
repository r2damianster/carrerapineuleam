'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Beneficiario {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  genero: string | null;
}

export default function BackfillGeneroPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [generosMap, setGenerosMap] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin'].includes(data.usuario.rol) || !data.usuario.modulos_acceso?.includes('vinculacion')) {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
        cargarBeneficiarios();
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/beneficiarios/genero'));
  }, [router]);

  const cargarBeneficiarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/beneficiarios');
      const data = await res.json();
      if (data.success) {
        setBeneficiarios(data.data);
        const map: Record<number, string> = {};
        data.data.forEach((b: Beneficiario) => {
          if (b.genero) map[b.id] = b.genero;
        });
        setGenerosMap(map);
      }
    } catch (err: any) {
      setMensaje(`Error cargando beneficiarios: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneroChange = (id: number, val: string) => {
    setGenerosMap(prev => ({ ...prev, [id]: val }));
  };

  const handleGuardarLote = async () => {
    setLoading(true);
    setMensaje('');
    try {
      const updates = Object.entries(generosMap)
        .filter(([_, genero]) => !!genero)
        .map(([idStr, genero]) => ({ id: parseInt(idStr), genero }));

      if (updates.length === 0) {
        setMensaje('No hay cambios de género para guardar.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/beneficiarios/genero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje(`✅ Se actualizaron ${data.updated} beneficiarios correctamente.`);
      cargarBeneficiarios();
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  const sinDatoCount = beneficiarios.filter(b => !generosMap[b.id]).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-uleam-blue mb-2">Completar Género de Beneficiarios (Backfill)</h1>
        <p className="text-gray-600 text-sm mb-6">
          Para incluir los datos demográficos correctos en los informes de Vinculación, asigna el género de cada beneficiario inscrito.
        </p>

        {mensaje && (
          <div className={`p-4 mb-6 rounded-md ${mensaje.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {mensaje}
          </div>
        )}

        <div className="flex items-center justify-between mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <div>
            <span className="font-bold text-gray-800">Total Beneficiarios: </span>
            <span className="text-blue-900 font-semibold">{beneficiarios.length}</span>
            <span className="ml-4 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
              Pendientes de género: {sinDatoCount}
            </span>
          </div>
          <button
            onClick={handleGuardarLote}
            disabled={loading}
            className="px-6 py-2.5 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 disabled:opacity-50 shadow"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios por Lote'}
          </button>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Beneficiario</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Género</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {beneficiarios.map((b, idx) => {
                const generoActual = generosMap[b.id] || '';
                return (
                  <tr key={b.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{b.nombres} {b.apellidos}</td>
                    <td className="px-4 py-3 text-gray-500">{b.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={generoActual}
                        onChange={e => handleGeneroChange(b.id, e.target.value)}
                        className="px-3 py-1.5 rounded border border-gray-300 outline-none focus:border-uleam-blue text-sm"
                      >
                        <option value="">-- Sin dato --</option>
                        <option value="femenino">Femenino</option>
                        <option value="masculino">Masculino</option>
                        <option value="otro">Otro</option>
                        <option value="prefiero_no_decir">Prefiero no decir</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {generoActual ? (
                        <span className="text-xs bg-green-100 text-green-800 font-medium px-2 py-0.5 rounded-full">Completo</span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-800 font-medium px-2 py-0.5 rounded-full">Pendiente</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleGuardarLote}
            disabled={loading}
            className="px-6 py-2.5 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 disabled:opacity-50 shadow"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios por Lote'}
          </button>
        </div>
      </div>
    </div>
  );
}
