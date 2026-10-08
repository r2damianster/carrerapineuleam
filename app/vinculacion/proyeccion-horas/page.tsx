'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { puedeGestionarVinculacion } from '@/lib/modulos';

type Estado = 'completo' | 'cumple' | 'en_riesgo' | 'no_cumple';

interface Flexible { registradas: number; tope: number }
interface FilaProyeccion {
  id: number;
  nombres: string;
  apellidos: string;
  supervisores: string;
  meta: number;
  acumuladas: number;
  pendientes: number;
  metaRitmo: number;
  ritmoAcumuladas: number;
  horasPorSemana: number;
  proyeccionRitmo: number;
  proyeccionTotal: number;
  deficitProyectado: number;
  horasFaltantes: number;
  horasPorSemanaRequeridas: number | null;
  flexibles: { autonomas: Flexible; investigacion: Flexible };
  flexiblesPorCumplir: number;
  diasTranscurridos: number;
  diasRestantes: number;
  estado: Estado;
  confianzaBaja: boolean;
  cupos: { tipo: string; etiqueta: string; cupo: number }[];
}
interface Periodo { id: number; nombre: string; fecha_inicio: string; fecha_fin: string }

type CampoOrden = 'proyeccionTotal' | 'proyeccionRitmo' | 'deficitProyectado' | 'ritmoAcumuladas' | 'acumuladas' | 'horasPorSemana' | 'nombre';
const CAMPOS_ORDEN: { id: CampoOrden; etiqueta: string }[] = [
  { id: 'proyeccionTotal', etiqueta: 'Proyección total al cierre' },
  { id: 'proyeccionRitmo', etiqueta: 'Total sin autónomas + investigación' },
  { id: 'deficitProyectado', etiqueta: 'Déficit proyectado' },
  { id: 'ritmoAcumuladas', etiqueta: 'Horas de clubes + podcast acumuladas' },
  { id: 'acumuladas', etiqueta: 'Horas acumuladas totales' },
  { id: 'horasPorSemana', etiqueta: 'Ritmo (h/sem)' },
  { id: 'nombre', etiqueta: 'Nombre' },
];

const ETIQUETA_ESTADO: Record<Estado, { texto: string; clases: string }> = {
  completo: { texto: 'Completó la meta', clases: 'bg-green-100 text-green-800' },
  cumple: { texto: 'Cumple si mantiene el ritmo', clases: 'bg-emerald-100 text-emerald-800' },
  en_riesgo: { texto: 'En riesgo', clases: 'bg-amber-100 text-amber-800' },
  no_cumple: { texto: 'No cumple a este ritmo', clases: 'bg-red-100 text-red-800' },
};

const primerNombreSupervisores = (supervisores: string) =>
  supervisores
    ? supervisores.split(', ').filter(Boolean).map(nombreCompleto => nombreCompleto.split(' ')[0]).join(', ')
    : 'Sin supervisor';

// Verde: pocas horas faltantes; naranja: relativamente pocas; rojo: muchas.
const clasesDeficit = (horasFaltantes: number, metaRitmo: number) => {
  const proporcion = metaRitmo > 0 ? horasFaltantes / metaRitmo : 1;
  if (proporcion <= 0.1) return 'bg-green-100 text-green-800';
  if (proporcion <= 0.35) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

export default function ProyeccionHorasPage() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [filas, setFilas] = useState<FilaProyeccion[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<Estado | 'todos'>('todos');
  const [filtroSupervisor, setFiltroSupervisor] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [campoOrden, setCampoOrden] = useState<CampoOrden>('proyeccionTotal');
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async (periodoSolicitado?: number | null) => {
    const consulta = periodoSolicitado ? `?periodo_id=${periodoSolicitado}` : '';
    const res = await fetch(`/api/vinculacion/proyeccion-horas${consulta}`);
    const data = await res.json();
    if (!data.success) { setMensaje(data.error || 'No se pudo cargar'); return; }
    setMensaje('');
    setFilas(data.data);
    setPeriodos(data.periodos);
    setPeriodoId(data.periodo.id);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!puedeGestionarVinculacion(data.usuario)) { router.push('/portal/dashboard'); return; }
        setVerificando(false);
        return cargar();
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/proyeccion-horas'));
  }, [router, cargar]);

  const periodoActual = periodos.find(periodo => periodo.id === periodoId);

  const conteos = useMemo(() => {
    const total: Record<Estado, number> = { no_cumple: 0, en_riesgo: 0, cumple: 0, completo: 0 };
    filas.forEach(fila => { total[fila.estado] += 1; });
    return total;
  }, [filas]);

  const supervisoresDisponibles = useMemo(() => {
    const nombres = new Set<string>();
    filas.forEach(fila => fila.supervisores.split(', ').filter(Boolean).forEach(nombre => nombres.add(nombre)));
    return Array.from(nombres).sort((a, b) => a.localeCompare(b));
  }, [filas]);

  const filasVisibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return filas
      .filter(fila => filtroEstado === 'todos' || fila.estado === filtroEstado)
      .filter(fila => !filtroSupervisor || fila.supervisores.split(', ').includes(filtroSupervisor))
      .filter(fila => !termino || `${fila.nombres} ${fila.apellidos} ${fila.supervisores}`.toLowerCase().includes(termino))
      .sort((a, b) => {
        const comparacion = campoOrden === 'nombre'
          ? `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`)
          : a[campoOrden] - b[campoOrden];
        return ordenAscendente ? comparacion : -comparacion;
      });
  }, [filas, filtroEstado, filtroSupervisor, busqueda, campoOrden, ordenAscendente]);

  if (verificando) return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-50 py-4 px-4">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="flex items-baseline gap-4 mb-2 shrink-0">
          <Link href="/portal/dashboard" className="text-blue-600 hover:underline font-medium text-sm">&larr; Volver al Portal PINE</Link>
          <h1 className="text-xl font-bold text-gray-800">Proyección de cumplimiento de horas</h1>
        </div>

        {mensaje && <div className="p-3 mb-2 rounded-md text-sm bg-red-50 text-red-700 shrink-0">{mensaje}</div>}

        <div className="flex flex-wrap items-end gap-4 mb-2 shrink-0">
          <label className="text-sm text-gray-700">
            Período
            <select value={periodoId ?? ''} onChange={evento => cargar(Number(evento.target.value))} className="block mt-1 border rounded-md px-2 py-1.5 bg-white">
              {periodos.map(periodo => <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Supervisor
            <select value={filtroSupervisor} onChange={evento => setFiltroSupervisor(evento.target.value)} className="block mt-1 border rounded-md px-2 py-1.5 bg-white">
              <option value="">Todos</option>
              {supervisoresDisponibles.map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Ordenar por
            <select value={campoOrden} onChange={evento => setCampoOrden(evento.target.value as CampoOrden)} className="block mt-1 border rounded-md px-2 py-1.5 bg-white">
              {CAMPOS_ORDEN.map(campo => <option key={campo.id} value={campo.id}>{campo.etiqueta}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Sentido
            <select value={ordenAscendente ? 'asc' : 'desc'} onChange={evento => setOrdenAscendente(evento.target.value === 'asc')} className="block mt-1 border rounded-md px-2 py-1.5 bg-white">
              <option value="asc">Menor a mayor</option>
              <option value="desc">Mayor a menor</option>
            </select>
          </label>
          <input
            value={busqueda}
            onChange={evento => setBusqueda(evento.target.value)}
            placeholder="Buscar pasante o supervisor"
            className="border rounded-md px-3 py-1.5 text-sm w-64"
          />
          {periodoActual && (
            <span className="text-xs text-gray-500">
              {periodoActual.fecha_inicio} → {periodoActual.fecha_fin}
              {filas[0] && ` · día ${filas[0].diasTranscurridos}, faltan ${filas[0].diasRestantes}`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2 mb-2 shrink-0">
          <button onClick={() => setFiltroEstado('todos')} className={`px-3 py-1.5 rounded-lg border text-left bg-white flex items-baseline gap-2 ${filtroEstado === 'todos' ? 'ring-2 ring-blue-500' : ''}`}>
            <span className="text-lg font-bold text-gray-800">{filas.length}</span>
            <span className="text-xs text-gray-500">Pasantes</span>
          </button>
          {(['no_cumple', 'en_riesgo', 'cumple', 'completo'] as Estado[]).map(estado => (
            <button key={estado} onClick={() => setFiltroEstado(estado)} className={`px-3 py-1.5 rounded-lg border text-left bg-white flex items-baseline gap-2 ${filtroEstado === estado ? 'ring-2 ring-blue-500' : ''}`}>
              <span className="text-lg font-bold text-gray-800">{conteos[estado]}</span>
              <span className="text-xs text-gray-500">{ETIQUETA_ESTADO[estado].texto}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-auto flex-1 min-h-0">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 text-left sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3">Pasante<br /><span className="font-normal text-xs">supervisor · cupo por tipo</span></th>
                <th className="p-3">Clubes + podcast<br /><span className="font-normal text-xs">acumuladas / necesarias</span></th>
                <th className="p-3">Ritmo<br /><span className="font-normal text-xs">h/sem · requerido</span></th>
                <th className="p-3">Total <span className="text-red-700 font-bold underline">SIN</span> autónomas + investigación<br /><span className="font-normal text-xs">proyección clubes + podcast</span></th>
                <th className="p-3">Proyección total<br /><span className="font-normal text-xs">asumiendo investigación y autónomas cumplidas</span></th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filasVisibles.map(fila => (
                <tr key={fila.id} className="border-t align-top">
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{fila.nombres} {fila.apellidos}</div>
                    <div className="text-xs text-gray-500">{primerNombreSupervisores(fila.supervisores)}</div>
                    {fila.estado !== 'completo' && fila.cupos.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {fila.cupos.map(item => <div key={item.tipo}>{item.etiqueta}: hasta {item.cupo} h</div>)}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div>{fila.ritmoAcumuladas} / {fila.metaRitmo} h</div>
                    <div className="w-28 h-1.5 bg-gray-200 rounded mt-1">
                      <div className="h-1.5 bg-blue-500 rounded" style={{ width: `${fila.metaRitmo > 0 ? Math.min(100, (fila.ritmoAcumuladas / fila.metaRitmo) * 100) : 100}%` }} />
                    </div>
                    {fila.pendientes > 0 && <div className="text-xs text-amber-700 mt-1">+{fila.pendientes} h por aprobar</div>}
                  </td>
                  <td className="p-3">
                    <div>{fila.horasPorSemana} h/sem</div>
                    <div className="text-xs">
                      {fila.horasPorSemanaRequeridas === null ? '—' : (
                        <span className={fila.horasPorSemanaRequeridas > fila.horasPorSemana ? 'text-red-700 font-medium' : 'text-gray-500'}>
                          necesita {fila.horasPorSemanaRequeridas} h/sem
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{fila.proyeccionRitmo} h</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold">{fila.proyeccionTotal} / {fila.meta} h</div>
                    <div className="text-xs text-gray-500">hoy: {fila.acumuladas} h</div>
                  </td>
                  <td className="p-3">
                    {(fila.estado === 'no_cumple' || fila.estado === 'en_riesgo') && fila.deficitProyectado > 0 ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${clasesDeficit(fila.deficitProyectado, fila.metaRitmo)}`}>
                        Le faltarían {fila.deficitProyectado} h
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ETIQUETA_ESTADO[fila.estado].clases}`}>{ETIQUETA_ESTADO[fila.estado].texto}</span>
                    )}
                    {fila.confianzaBaja && <div className="text-xs text-gray-400 mt-1">Pocos días de datos: tendencia poco fiable</div>}
                  </td>
                </tr>
              ))}
              {filasVisibles.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">Sin pasantes para este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-500 mt-2 shrink-0 space-y-0.5">
          <p>
            <strong>Clubes y podcast</strong> se proyectan con el ritmo del período (horas aprobadas ÷ días transcurridos × días restantes).
            <strong> Investigación y autónomas</strong> no se proyectan por ritmo: se asume que se cumplen al 100 % de su tope.
            <strong> Proyección total</strong> = clubes + podcast proyectados + investigación y autónomas completas. Solo cuentan horas aprobadas.
          </p>
          <p>
            Estado, según clubes + podcast frente a lo necesario: <strong>Cumple</strong> si la proyección lo alcanza; si no, <em>le faltarían X h</em>:
            <span className="text-green-700 font-medium"> verde</span> (pocas, ≤10 %),
            <span className="text-orange-600 font-medium"> naranja</span> (relativamente pocas, ≤35 %),
            <span className="text-red-700 font-medium"> rojo</span> (muchas).
            Los topes por tipo se editan en <Link href="/vinculacion/topes-horas" className="text-blue-600 hover:underline">Topes de horas</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
