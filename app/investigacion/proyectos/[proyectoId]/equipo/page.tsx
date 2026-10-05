'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import AvanceMetasInvestigacion from '@/components/AvanceMetasInvestigacion';

interface Aportante {
  usuario_id: number;
  nombres: string;
  apellidos: string;
  email: string;
  activado: boolean;
  rol: string;
  tipo: 'docente' | 'estudiante_apoyo' | 'externo';
  activo: boolean;
  visible_en_web: boolean;
  tarjeta_activa: boolean | null;
  horas_validadas: number;
  aportes_validados: number;
  aportes_pendientes: number;
}

interface Aporte {
  id: number;
  usuario_id: number;
  nombres: string;
  apellidos: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  horas: number;
  estado_validacion: 'pendiente' | 'validado' | 'rechazado';
  motivo_rechazo: string | null;
  actividad_plan: string | null;
}

const ETIQUETA_TIPO: Record<Aportante['tipo'], string> = {
  docente: 'Docente',
  estudiante_apoyo: 'Estudiante de apoyo',
  externo: 'Miembro externo',
};

const FORMULARIO_VACIO = { email: '', nombres: '', apellidos: '', tipo: 'externo', visible_en_web: false };

// Equipo de aportantes de un proyecto de Investigación: lo administra el líder/colíder. Es independiente
// de Vinculación: las horas son solo reconocimiento (sin meta ni tope) y valida el líder.
export default function EquipoInvestigacionPage() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const [estado, setEstado] = useState<'cargando' | 'sin-permiso' | 'listo'>('cargando');
  const [aportantes, setAportantes] = useState<Aportante[]>([]);
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const cargar = useCallback(async () => {
    const respuesta = await fetch(`/api/investigacion/proyectos/${proyectoId}/equipo`);
    if (!respuesta.ok) {
      setEstado('sin-permiso');
      return;
    }
    const datos = await respuesta.json();
    setAportantes(datos.aportantes ?? []);
    setAportes(datos.aportes ?? []);
    setEstado('listo');
  }, [proyectoId]);

  useEffect(() => {
    cargar().catch(() => setEstado('sin-permiso'));
  }, [cargar]);

  const agregarAportante = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setGuardando(true);
    setMensaje('');
    const respuesta = await fetch(`/api/investigacion/proyectos/${proyectoId}/equipo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formulario),
    });
    const datos = await respuesta.json();
    setGuardando(false);
    if (!respuesta.ok) {
      setMensaje(datos.error || 'No se pudo agregar');
      return;
    }
    setFormulario(FORMULARIO_VACIO);
    setMensaje('Persona agregada al proyecto.');
    cargar();
  };

  const actualizarAportante = async (usuarioId: number, accion: 'quitar' | 'reactivar' | 'web', visibleEnWeb?: boolean) => {
    const respuesta = await fetch(`/api/investigacion/proyectos/${proyectoId}/equipo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, accion, visible_en_web: visibleEnWeb }),
    });
    if (!respuesta.ok) setMensaje((await respuesta.json()).error || 'No se pudo actualizar');
    cargar();
  };

  const resolverAporte = async (aporteId: number, accion: 'validar' | 'rechazar') => {
    const respuesta = await fetch(`/api/investigacion/aportes/${aporteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, motivo: motivoRechazo }),
    });
    if (!respuesta.ok) {
      setMensaje((await respuesta.json()).error || 'No se pudo resolver el aporte');
      return;
    }
    setRechazandoId(null);
    setMotivoRechazo('');
    cargar();
  };

  const aportesPendientes = aportes.filter((aporte) => aporte.estado_validacion === 'pendiente');
  const aportesResueltos = aportes.filter((aporte) => aporte.estado_validacion !== 'pendiente');

  return (
    <>
      <Header />
      <main className="mx-auto mt-16 max-w-4xl px-4 py-10">
        <Link href={`/portal/proyecto/${proyectoId}`} className="text-xs font-semibold text-blue-600 hover:underline">&larr; Volver al proyecto</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">Equipo de investigación</h1>
        <p className="text-sm text-gray-600">
          Personas que aportan a este proyecto: docentes, estudiantes de apoyo y miembros externos. Sus horas son un reconocimiento
          (no hay meta ni tope) y solo cuentan los aportes que tú validas. No tiene relación con Vinculación.
        </p>

        {estado === 'cargando' && <p className="mt-4 text-sm text-gray-500">Cargando…</p>}
        {estado === 'sin-permiso' && <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">No tienes permiso para administrar este proyecto.</p>}

        {estado === 'listo' && (
          <>
            {mensaje && <p className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{mensaje}</p>}

            <AvanceMetasInvestigacion proyectoId={proyectoId} />

            <form onSubmit={agregarAportante} className="mt-6 space-y-3 rounded-lg border bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-gray-800">Agregar persona</h2>
              <p className="text-xs text-gray-500">
                Escribe su correo (cualquiera). Si ya tiene cuenta se agrega directo; si no, escribe sus nombres y se le crea una cuenta
                que activa con su primer inicio de sesión. Los pasantes de Vinculación no pueden ser aportantes.
              </p>
              <input required type="email" placeholder="Correo" className="w-full rounded border p-2 text-sm" value={formulario.email} onChange={(evento) => setFormulario({ ...formulario, email: evento.target.value })} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="Nombres (si no tiene cuenta)" className="rounded border p-2 text-sm" value={formulario.nombres} onChange={(evento) => setFormulario({ ...formulario, nombres: evento.target.value })} />
                <input placeholder="Apellidos (si no tiene cuenta)" className="rounded border p-2 text-sm" value={formulario.apellidos} onChange={(evento) => setFormulario({ ...formulario, apellidos: evento.target.value })} />
              </div>
              <select className="w-full rounded border p-2 text-sm" value={formulario.tipo} onChange={(evento) => setFormulario({ ...formulario, tipo: evento.target.value })}>
                <option value="externo">Miembro externo</option>
                <option value="estudiante_apoyo">Estudiante de apoyo</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={formulario.visible_en_web} onChange={(evento) => setFormulario({ ...formulario, visible_en_web: evento.target.checked })} />
                Mostrar como miembro en la página web del proyecto (queda pendiente de aprobación del administrador del sitio)
              </label>
              <button disabled={guardando} className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                {guardando ? 'Agregando…' : 'Agregar al proyecto'}
              </button>
            </form>

            <h2 className="mt-8 font-semibold text-gray-800">Aportes por validar ({aportesPendientes.length})</h2>
            {aportesPendientes.length === 0 && <p className="mt-2 text-sm text-gray-500">No hay aportes pendientes.</p>}
            <ul className="mt-2 space-y-2">
              {aportesPendientes.map((aporte) => (
                <li key={aporte.id} className="rounded-lg border bg-white p-3 text-sm shadow-sm">
                  <p className="text-xs text-gray-500">
                    {aporte.nombres} {aporte.apellidos} · {new Date(aporte.fecha).toLocaleDateString('es-EC')} · {aporte.tipo} · {aporte.horas} h
                    {aporte.actividad_plan && <> · Meta: {aporte.actividad_plan}</>}
                  </p>
                  <p className="mt-1 text-gray-700">{aporte.descripcion}</p>
                  {rechazandoId === aporte.id ? (
                    <div className="mt-2 flex gap-2">
                      <input placeholder="Motivo del rechazo" className="flex-1 rounded border p-1 text-sm" value={motivoRechazo} onChange={(evento) => setMotivoRechazo(evento.target.value)} />
                      <button onClick={() => resolverAporte(aporte.id, 'rechazar')} className="rounded bg-red-600 px-3 py-1 text-xs text-white">Confirmar rechazo</button>
                      <button onClick={() => setRechazandoId(null)} className="text-xs text-gray-500">Cancelar</button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => resolverAporte(aporte.id, 'validar')} className="rounded bg-green-600 px-3 py-1 text-xs text-white">Validar</button>
                      <button onClick={() => setRechazandoId(aporte.id)} className="rounded border border-red-300 px-3 py-1 text-xs text-red-600">Rechazar</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <h2 className="mt-8 font-semibold text-gray-800">Personas del proyecto ({aportantes.length})</h2>
            {aportantes.length === 0 && <p className="mt-2 text-sm text-gray-500">Todavía no hay aportantes.</p>}
            <ul className="mt-2 space-y-2">
              {aportantes.map((aportante) => (
                <li key={aportante.usuario_id} className={`rounded-lg border bg-white p-3 shadow-sm ${aportante.activo ? '' : 'opacity-60'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{aportante.nombres} {aportante.apellidos}</p>
                      <p className="text-xs text-gray-500">
                        {aportante.email} · {ETIQUETA_TIPO[aportante.tipo]}
                        {!aportante.activado && aportante.rol === 'colaborador' && ' · aún no ha iniciado sesión'}
                        {!aportante.activo && ' · fuera del proyecto'}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        Horas de reconocimiento: <strong>{aportante.horas_validadas}</strong> · Aportes validados: {aportante.aportes_validados}
                        {aportante.aportes_pendientes > 0 && <> · Por validar: {aportante.aportes_pendientes}</>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      {aportante.activo ? (
                        <>
                          <label className="flex items-center gap-1 text-gray-700">
                            <input type="checkbox" checked={aportante.visible_en_web} onChange={(evento) => actualizarAportante(aportante.usuario_id, 'web', evento.target.checked)} />
                            Mostrar en la web
                          </label>
                          {aportante.visible_en_web && aportante.tarjeta_activa === false && <span className="text-amber-600">Pendiente de aprobación del sitio</span>}
                          <button onClick={() => actualizarAportante(aportante.usuario_id, 'quitar')} className="text-red-600 hover:underline">Quitar del proyecto</button>
                        </>
                      ) : (
                        <button onClick={() => actualizarAportante(aportante.usuario_id, 'reactivar')} className="text-blue-600 hover:underline">Reactivar</button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {aportesResueltos.length > 0 && (
              <details className="mt-8">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">Historial de aportes ({aportesResueltos.length})</summary>
                <ul className="mt-2 space-y-2">
                  {aportesResueltos.map((aporte) => (
                    <li key={aporte.id} className="rounded border bg-gray-50 p-2 text-sm">
                      <p className="text-xs text-gray-500">
                        {aporte.nombres} {aporte.apellidos} · {new Date(aporte.fecha).toLocaleDateString('es-EC')} · {aporte.horas} h ·{' '}
                        {aporte.estado_validacion === 'validado' ? 'Validado' : `Rechazado: ${aporte.motivo_rechazo ?? ''}`}
                        {aporte.actividad_plan && <> · Meta: {aporte.actividad_plan}</>}
                      </p>
                      <p className="text-gray-700">{aporte.descripcion}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </main>
    </>
  );
}
