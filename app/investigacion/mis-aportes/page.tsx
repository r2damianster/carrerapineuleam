'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import RegistrarDifusionInvestigacion from '@/components/RegistrarDifusionInvestigacion';

interface ProyectoAportante {
  id: string;
  nombre_oficial: string;
}

interface ActividadPlan {
  id: number;
  actividad: string;
  unidad: string | null;
  proyecto_id: string;
  ciclo: string | null;
}

interface Aporte {
  id: number;
  proyecto_id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  horas: number;
  estado_validacion: 'pendiente' | 'validado' | 'rechazado';
  motivo_rechazo: string | null;
  actividad_plan: string | null;
}

const ETIQUETA_ESTADO: Record<Aporte['estado_validacion'], string> = {
  pendiente: 'Por validar',
  validado: 'Validado',
  rechazado: 'Rechazado',
};

const ETIQUETA_TIPO_APORTE: Record<string, string> = {
  actividad: 'Actividad',
  evento: 'Evento',
  podcast: 'Podcast',
  producto: 'Producto',
  otro: 'Otro',
};

function formularioInicial(proyectoId: string) {
  return { proyecto_id: proyectoId, actividad_plan_id: '', fecha: new Date().toISOString().slice(0, 10), tipo: 'actividad', descripcion: '', horas: '' };
}

// Aportes de quien colabora con un proyecto de Investigación (docente o colaborador). Las horas son
// un reconocimiento, no una obligación; el líder/colíder del proyecto valida cada aporte.
export default function MisAportesPage() {
  const [estado, setEstado] = useState<'cargando' | 'sin-permiso' | 'listo'>('cargando');
  const [proyectos, setProyectos] = useState<ProyectoAportante[]>([]);
  const [actividadesPlan, setActividadesPlan] = useState<ActividadPlan[]>([]);
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial(''));
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const respuesta = await fetch('/api/investigacion/mis-aportes');
    if (!respuesta.ok) {
      setEstado('sin-permiso');
      return;
    }
    const datos = await respuesta.json();
    setProyectos(datos.proyectos ?? []);
    setActividadesPlan(datos.actividadesPlan ?? []);
    setAportes(datos.aportes ?? []);
    setFormulario((anterior) => (anterior.proyecto_id || !datos.proyectos?.length ? anterior : formularioInicial(datos.proyectos[0].id)));
    setEstado('listo');
  }, []);

  useEffect(() => {
    cargar().catch(() => setEstado('sin-permiso'));
  }, [cargar]);

  const nombreProyecto = (proyectoId: string) => proyectos.find((proyecto) => proyecto.id === proyectoId)?.nombre_oficial ?? proyectoId;
  const actividadesDelProyecto = actividadesPlan.filter((actividad) => actividad.proyecto_id === formulario.proyecto_id);
  const horasValidadas = aportes.filter((aporte) => aporte.estado_validacion === 'validado').reduce((total, aporte) => total + Number(aporte.horas), 0);

  const registrarAporte = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setGuardando(true);
    setMensaje('');
    const respuesta = await fetch('/api/investigacion/mis-aportes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formulario),
    });
    const datos = await respuesta.json();
    setGuardando(false);
    if (!respuesta.ok) {
      setMensaje(datos.error || 'No se pudo registrar');
      return;
    }
    setFormulario(formularioInicial(formulario.proyecto_id));
    setMensaje('Aporte registrado. Queda por validar por el líder del proyecto.');
    cargar();
  };

  return (
    <>
      <Header />
      <main className="mx-auto mt-16 max-w-3xl px-4 py-10">
        <Link href="/portal/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">&larr; Volver al Portal</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">Mis aportes de Investigación</h1>
        <p className="text-sm text-gray-600">
          Registra tus actividades y productos en los proyectos donde colaboras. Las horas son un reconocimiento (no hay mínimo)
          y el líder del proyecto valida cada aporte.
        </p>

        {estado === 'cargando' && <p className="mt-4 text-sm text-gray-500">Cargando…</p>}
        {estado === 'sin-permiso' && <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">No tienes acceso a esta sección.</p>}

        {estado === 'listo' && proyectos.length === 0 && (
          <p className="mt-6 rounded border bg-white p-4 text-sm text-gray-600">Todavía no formas parte de ningún proyecto de investigación. El líder o colíder del proyecto debe agregarte.</p>
        )}

        {estado === 'listo' && proyectos.length > 0 && (
          <>
            <p className="mt-4 text-sm text-gray-700">Horas de reconocimiento validadas: <strong>{horasValidadas}</strong></p>
            {mensaje && <p className="mt-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{mensaje}</p>}

            <form onSubmit={registrarAporte} className="mt-4 space-y-3 rounded-lg border bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-gray-800">Registrar un aporte</h2>
              <select required className="w-full rounded border p-2 text-sm" value={formulario.proyecto_id} onChange={(evento) => setFormulario({ ...formulario, proyecto_id: evento.target.value, actividad_plan_id: '' })}>
                {proyectos.map((proyecto) => <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre_oficial}</option>)}
              </select>
              <select className="w-full rounded border p-2 text-sm" value={formulario.actividad_plan_id} onChange={(evento) => setFormulario({ ...formulario, actividad_plan_id: evento.target.value })}>
                <option value="">No corresponde a una meta específica del plan</option>
                {actividadesDelProyecto.map((actividad) => (
                  <option key={actividad.id} value={actividad.id}>
                    {actividad.ciclo ? `[${actividad.ciclo}] ` : ''}{actividad.actividad}{actividad.unidad ? ` (${actividad.unidad})` : ''}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input required type="date" className="rounded border p-2 text-sm" value={formulario.fecha} onChange={(evento) => setFormulario({ ...formulario, fecha: evento.target.value })} />
                <select className="rounded border p-2 text-sm" value={formulario.tipo} onChange={(evento) => setFormulario({ ...formulario, tipo: evento.target.value })}>
                  {Object.entries(ETIQUETA_TIPO_APORTE).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                </select>
                <input type="number" min="0" max="100" step="0.25" placeholder="Horas (opcional)" className="rounded border p-2 text-sm" value={formulario.horas} onChange={(evento) => setFormulario({ ...formulario, horas: evento.target.value })} />
              </div>
              <textarea required rows={3} placeholder="¿Qué hiciste?" className="w-full rounded border p-2 text-sm" value={formulario.descripcion} onChange={(evento) => setFormulario({ ...formulario, descripcion: evento.target.value })} />
              <button disabled={guardando} className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                {guardando ? 'Registrando…' : 'Registrar aporte'}
              </button>
            </form>

            <RegistrarDifusionInvestigacion proyectos={proyectos} actividadesPlan={actividadesPlan} onRegistrado={cargar} />

            <h2 className="mt-8 font-semibold text-gray-800">Mis aportes ({aportes.length})</h2>
            {aportes.length === 0 && <p className="mt-2 text-sm text-gray-500">Aún no has registrado aportes.</p>}
            <ul className="mt-2 space-y-2">
              {aportes.map((aporte) => (
                <li key={aporte.id} className="rounded-lg border bg-white p-3 text-sm shadow-sm">
                  <p className="text-xs text-gray-500">
                    {new Date(aporte.fecha).toLocaleDateString('es-EC')} · {nombreProyecto(aporte.proyecto_id)} · {ETIQUETA_TIPO_APORTE[aporte.tipo] ?? aporte.tipo} · {aporte.horas} h · {ETIQUETA_ESTADO[aporte.estado_validacion]}
                    {aporte.actividad_plan && <> · Meta: {aporte.actividad_plan}</>}
                  </p>
                  <p className="mt-1 text-gray-700">{aporte.descripcion}</p>
                  {aporte.estado_validacion === 'rechazado' && aporte.motivo_rechazo && <p className="mt-1 text-xs text-red-600">Motivo: {aporte.motivo_rechazo}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
