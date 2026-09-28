'use client';

import { useState } from 'react';

export interface FilaResumenValidacion {
  label: string;
  value: string;
}

interface ResumenValidacionModalProps {
  titulo: string;
  filas: FilaResumenValidacion[];
  similitud: { porcentaje: number; candidatoId: number } | null;
  bloqueado: boolean;
  confirmando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Modal genérico de "Resumen de Validación" — exige revisar los datos antes de guardar
// (punto 2: carga activa + confirmación previa). Reusado en Asistencia, Difusión y
// Registro de beneficiario. Mismo patrón visual que EnlaceDifusionModal/QRModal.
export default function ResumenValidacionModal({
  titulo, filas, similitud, bloqueado, confirmando, onConfirmar, onCancelar,
}: ResumenValidacionModalProps) {
  const [revisado, setRevisado] = useState(false);
  const muestraAvisoSimilitud = similitud !== null && similitud.porcentaje >= 70;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-bold text-uleam-blue">{titulo}</h2>
        <p className="mb-4 text-sm text-gray-600">Revisa los datos antes de guardar.</p>

        <div className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
          {filas.map((fila) => (
            <div key={fila.label} className="flex justify-between gap-4 px-3 py-2">
              <span className="text-gray-500">{fila.label}</span>
              <span className="text-right font-medium text-gray-800">{fila.value}</span>
            </div>
          ))}
        </div>

        {muestraAvisoSimilitud && (
          <div className={`mb-4 rounded-lg p-3 text-sm ${bloqueado ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
            <p className="font-bold mb-1">
              {bloqueado ? 'Registro bloqueado: parece un duplicado exacto' : `Posible duplicado (${similitud!.porcentaje}% de similitud)`}
            </p>
            <p>
              {bloqueado
                ? 'Este registro coincide casi por completo con el #' + similitud!.candidatoId + '. No se puede guardar así — revisa si ya fue registrado.'
                : `Se parece bastante al registro #${similitud!.candidatoId}. Si es el mismo grupo, no lo dupliques. Si es distinto, puedes continuar.`}
            </p>
          </div>
        )}

        {!bloqueado && (
          <label className="mb-4 flex cursor-pointer items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" className="mt-1" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} />
            <span>Confirmo que revisé estos datos y son correctos.</span>
          </label>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={bloqueado || !revisado || confirmando}
            onClick={onConfirmar}
            className="w-full py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition disabled:opacity-50"
          >
            {confirmando ? 'Guardando...' : 'Confirmar y guardar'}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            disabled={confirmando}
            className="w-full py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition text-sm disabled:opacity-50"
          >
            Cancelar y revisar
          </button>
        </div>
      </div>
    </div>
  );
}
