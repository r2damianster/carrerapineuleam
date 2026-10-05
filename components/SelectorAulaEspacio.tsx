'use client';

import { useEffect, useState } from 'react';

interface SelectorAulaEspacioProps {
  espacioId: string;
  aulaId: string;
  onChange: (aulaId: string) => void;
  onUsaAulas?: (usaAulas: boolean) => void;
}

// Muestra el selector de aula solo si el espacio elegido usa subaulas; quien inscribe
// beneficiarios debe indicar a cuál aula pertenecen, para que luego aparezcan en su asistencia.
export default function SelectorAulaEspacio({ espacioId, aulaId, onChange, onUsaAulas }: SelectorAulaEspacioProps) {
  const [aulas, setAulas] = useState<any[]>([]);
  const [usaAulas, setUsaAulas] = useState(false);

  useEffect(() => {
    onChange('');
    setAulas([]);
    setUsaAulas(false);
    onUsaAulas?.(false);
    if (!espacioId) return;
    fetch(`/api/espacios/${espacioId}/aulas`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        setUsaAulas(!!d.usa_aulas);
        onUsaAulas?.(!!d.usa_aulas);
        setAulas(d.data.filter((aula: any) => aula.activa));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espacioId]);

  if (!usaAulas) return null;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Aula del beneficiario</label>
      <select required value={aulaId} onChange={e => onChange(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue">
        <option value="">Selecciona el aula...</option>
        {aulas.map(aula => <option key={aula.id} value={aula.id}>{aula.nombre}</option>)}
      </select>
    </div>
  );
}
