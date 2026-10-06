'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ContributionForm from '@/components/contribuciones/ContributionForm';
import { TIPO_PUBLICACION_LABEL, type TipoPublicacionEnlace } from '@/lib/enlaceContribucion';

interface InfoEnlace {
  nombre_invitado: string;
  tipo_publicacion: TipoPublicacionEnlace;
  docente_nombre: string;
  docente_autor: { nombre: string; orden: number } | null;
}

// Pública (sin login): protegida solo por el token del enlace. Va fuera de /contribuciones*
// porque el middleware exige sesión de docente en todo ese prefijo.
export default function EnviarContribucionPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<InfoEnlace | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`/api/enlaces-contribucion/${token}`, { cache: 'no-store' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInfo(data.data);
      })
      .catch(error => setErrorCarga(error.message || 'Este enlace ya no está disponible'))
      .finally(() => setCargando(false));
  }, [token]);

  if (cargando) return <div className="p-6 text-center text-gray-500">Cargando…</div>;

  if (errorCarga || !info) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-xl font-bold text-red-700 mb-2">Enlace no disponible</h1>
        <p className="text-gray-600">{errorCarga || 'Este enlace ya no está disponible'}. Pide uno nuevo al docente que te lo envió.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="max-w-3xl mx-auto px-4 pt-4 text-sm text-gray-500">
        Hola, {info.nombre_invitado}. Tipo de contribución: <strong>{TIPO_PUBLICACION_LABEL[info.tipo_publicacion]}</strong>
      </p>
      <ContributionForm
        tipo={info.tipo_publicacion}
        mode="public"
        publicToken={token}
        docenteAutor={info.docente_autor}
        docenteNombre={info.docente_nombre}
      />
    </div>
  );
}
