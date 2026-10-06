'use client';

// Constructor de reglas de filtro, estilo "formato condicional" de Excel:
// cada regla = [Campo] [operador] [valor]. Al elegir el campo aparecen sus opciones.
// Todas las reglas se combinan con "y". Cada campo se puede usar una sola vez.

export type TipoCampoRegla = 'seleccion' | 'fechas' | 'numero' | 'texto';

export interface CampoRegla {
  clave: string;
  etiqueta: string;
  tipo: TipoCampoRegla;
  opciones?: { valor: string; etiqueta: string }[]; // solo 'seleccion'
  sufijo?: string; // solo 'numero' (ej. "h")
  placeholder?: string; // solo 'texto'
  visible?: boolean; // false = no se ofrece (ej. campo solo para el líder)
}

export interface ReglaFiltro {
  id: number;
  campo: string;
  operador: string;
  valor: string;
  valor2: string; // segundo extremo de "entre"
}

export const OPERADORES_NUMERO = ['<', '<=', '=', '>=', '>'];
export const OPERADORES_FECHA: { valor: string; etiqueta: string }[] = [
  { valor: 'entre', etiqueta: 'entre' },
  { valor: 'desde', etiqueta: 'desde (incluye)' },
  { valor: 'hasta', etiqueta: 'hasta (incluye)' },
  { valor: 'en', etiqueta: 'el día' },
];

let contadorReglas = 0;

export function crearRegla(campo: string, tipo: TipoCampoRegla, valor = ''): ReglaFiltro {
  contadorReglas += 1;
  const operador = tipo === 'numero' ? '>=' : tipo === 'fechas' ? 'entre' : 'es';
  return { id: contadorReglas, campo, operador, valor, valor2: '' };
}

export function reglaDe(reglas: ReglaFiltro[], campo: string): ReglaFiltro | undefined {
  return reglas.find(regla => regla.campo === campo);
}

export function cumpleNumero(numero: number, regla: ReglaFiltro): boolean {
  if (regla.valor === '' || isNaN(Number(regla.valor))) return true;
  const referencia = Number(regla.valor);
  switch (regla.operador) {
    case '<': return numero < referencia;
    case '<=': return numero <= referencia;
    case '=': return Math.abs(numero - referencia) < 0.001;
    case '>': return numero > referencia;
    default: return numero >= referencia;
  }
}

const aMarca = (fecha: string) => new Date(`${fecha}T00:00:00`).getTime();
const DIA_MS = 86399999;

// marcaTiempo: milisegundos del día del registro (inicio del día).
export function cumpleFecha(marcaTiempo: number, regla: ReglaFiltro): boolean {
  const { operador, valor, valor2 } = regla;
  if (operador === 'entre') {
    if (valor && marcaTiempo < aMarca(valor)) return false;
    if (valor2 && marcaTiempo > aMarca(valor2) + DIA_MS) return false;
    return true;
  }
  if (!valor) return true;
  if (operador === 'desde') return marcaTiempo >= aMarca(valor);
  if (operador === 'hasta') return marcaTiempo <= aMarca(valor) + DIA_MS;
  return marcaTiempo >= aMarca(valor) && marcaTiempo <= aMarca(valor) + DIA_MS; // 'en'
}

const CLASE_CONTROL = 'rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm';

interface Props {
  campos: CampoRegla[];
  reglas: ReglaFiltro[];
  onCambiar: (reglas: ReglaFiltro[]) => void;
  titulo?: string;
}

export default function ReglasFiltro({ campos, reglas, onCambiar, titulo = 'Filtrar por reglas' }: Props) {
  const camposVisibles = campos.filter(campo => campo.visible !== false);
  const disponibles = (reglaActual?: ReglaFiltro) =>
    camposVisibles.filter(campo => campo.clave === reglaActual?.campo || !reglas.some(regla => regla.campo === campo.clave));
  const definicion = (clave: string) => camposVisibles.find(campo => campo.clave === clave);

  const actualizar = (id: number, cambios: Partial<ReglaFiltro>) =>
    onCambiar(reglas.map(regla => (regla.id === id ? { ...regla, ...cambios } : regla)));

  const cambiarCampo = (regla: ReglaFiltro, clave: string) => {
    const nuevo = definicion(clave);
    if (!nuevo) return;
    const base = crearRegla(clave, nuevo.tipo, nuevo.tipo === 'seleccion' ? (nuevo.opciones?.[0]?.valor ?? '') : '');
    onCambiar(reglas.map(actual => (actual.id === regla.id ? { ...base, id: regla.id } : actual)));
  };

  const agregar = () => {
    const libre = disponibles()[0];
    if (!libre) return;
    // Selección: arranca con la primera opción para que la regla ya tenga sentido.
    onCambiar([...reglas, crearRegla(libre.clave, libre.tipo, libre.tipo === 'seleccion' ? (libre.opciones?.[0]?.valor ?? '') : '')]);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-800">{titulo}</h2>
        {reglas.length > 0 && (
          <button onClick={() => onCambiar([])} className="text-xs text-gray-500 hover:underline">Quitar todas</button>
        )}
      </div>

      {reglas.length === 0 && <p className="text-xs text-gray-400 mb-2">Sin reglas: se muestra todo.</p>}

      <div className="space-y-2">
        {reglas.map(regla => {
          const campo = definicion(regla.campo);
          if (!campo) return null;
          return (
            <div key={regla.id} className="flex flex-wrap items-center gap-2">
              <select value={regla.campo} onChange={e => cambiarCampo(regla, e.target.value)} className={`${CLASE_CONTROL} font-semibold`}>
                {disponibles(regla).map(opcion => <option key={opcion.clave} value={opcion.clave}>{opcion.etiqueta}</option>)}
              </select>

              {campo.tipo === 'seleccion' && (
                <>
                  <span className="text-xs text-gray-500">es</span>
                  <select value={regla.valor} onChange={e => actualizar(regla.id, { valor: e.target.value })} className={CLASE_CONTROL}>
                    {campo.opciones?.map(opcion => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
                  </select>
                </>
              )}

              {campo.tipo === 'numero' && (
                <>
                  <select value={regla.operador} onChange={e => actualizar(regla.id, { operador: e.target.value })} className={CLASE_CONTROL}>
                    {OPERADORES_NUMERO.map(operador => <option key={operador} value={operador}>{operador}</option>)}
                  </select>
                  <input type="number" min="0" step="0.5" value={regla.valor} onChange={e => actualizar(regla.id, { valor: e.target.value })} className={`${CLASE_CONTROL} w-24`} />
                  {campo.sufijo && <span className="text-xs text-gray-500">{campo.sufijo}</span>}
                </>
              )}

              {campo.tipo === 'fechas' && (
                <>
                  <select value={regla.operador} onChange={e => actualizar(regla.id, { operador: e.target.value })} className={CLASE_CONTROL}>
                    {OPERADORES_FECHA.map(operador => <option key={operador.valor} value={operador.valor}>{operador.etiqueta}</option>)}
                  </select>
                  <input type="date" value={regla.valor} onChange={e => actualizar(regla.id, { valor: e.target.value })} className={CLASE_CONTROL} />
                  {regla.operador === 'entre' && (
                    <>
                      <span className="text-xs text-gray-500">y</span>
                      <input type="date" value={regla.valor2} onChange={e => actualizar(regla.id, { valor2: e.target.value })} className={CLASE_CONTROL} />
                    </>
                  )}
                </>
              )}

              {campo.tipo === 'texto' && (
                <>
                  <span className="text-xs text-gray-500">contiene</span>
                  <input value={regla.valor} onChange={e => actualizar(regla.id, { valor: e.target.value })} placeholder={campo.placeholder} className={`${CLASE_CONTROL} w-56`} />
                </>
              )}

              <button onClick={() => onCambiar(reglas.filter(actual => actual.id !== regla.id))} title="Quitar regla" className="rounded px-2 text-gray-400 hover:bg-gray-100 hover:text-red-600">✕</button>
            </div>
          );
        })}
      </div>

      {disponibles().length > 0 && (
        <button onClick={agregar} className="mt-3 text-sm font-semibold text-blue-700 hover:underline">+ Agregar regla</button>
      )}
    </div>
  );
}
