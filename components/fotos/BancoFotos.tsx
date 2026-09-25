'use client';

// Banco de fotos único (WP8). Lo usan /admin/photos (modo 'admin') y el panel del líder
// /portal/proyecto/[proyectoId]/fotos (modo 'lider'). Toda la seguridad real está en las APIs
// (/api/photos/banco, /accion, /ubicaciones, /api/photos y /api/photos/[id]); aquí solo se
// limita lo que se ofrece en pantalla.
//
// NO usar next/image aquí: los dominios de Cloudinary no están configurados en next.config.js y
// rompería el despliegue. Se usa <img loading="lazy"> con la miniatura que ya trae la API.

import { useCallback, useEffect, useMemo, useState } from 'react';

interface FotoBanco {
  id: string;
  url: string;
  miniatura: string;
  titulo: string | null;
  descripcion: string | null;
  ubicaciones: string[];
  proyectos: string[];
  order: number;
  activo: boolean;
  posicion: number;
  origen: string;
  menores: 'no' | 'si' | 'revisar';
  visibilidad: 'publicable' | 'interna';
  fecha_evento: string | null;
  created: string;
}

interface UbicacionCatalogo {
  slug: string;
  nombre: string;
  proyecto_id: string | null;
  max_fotos: number;
  solo_admin: boolean;
  publicadas: number | string;
}

interface ProyectoBasico {
  id: string;
  nombre_oficial: string;
}

interface BancoFotosProps {
  modo: 'admin' | 'lider';
  /** Solo modo 'lider': el proyecto que se administra. */
  proyectoId?: string;
}

const ETIQUETA_ORIGEN: Record<string, string> = {
  admin: 'Subida por admin',
  lider: 'Subida por líder',
  evidencia_evento: 'Evidencia de evento',
  evento: 'Evento',
  podcast: 'Podcast',
  asistencia: 'Asistencia',
};

const TAMANO_PAGINA = 24;

export default function BancoFotos({ modo, proyectoId }: BancoFotosProps) {
  const [fotos, setFotos] = useState<FotoBanco[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [catalogo, setCatalogo] = useState<UbicacionCatalogo[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoBasico[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');

  const [filtros, setFiltros] = useState({
    q: '', origen: '', ubicacion: '', proyecto: '', desde: '', hasta: '', menores: '', estado: '',
  });
  const [ubicacionesParaPublicar, setUbicacionesParaPublicar] = useState<string[]>([]);
  const [fotoEnEdicion, setFotoEnEdicion] = useState<FotoBanco | null>(null);
  const [mostrarSubida, setMostrarSubida] = useState(false);

  const esAdmin = modo === 'admin';

  // Estado inicial de filtros desde la URL (los avisos del dashboard enlazan con ?menores=revisar, ?estado=sin_ubicar…).
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    setFiltros((previos) => ({
      ...previos,
      q: parametros.get('q') ?? '',
      origen: parametros.get('origen') ?? '',
      ubicacion: parametros.get('ubicacion') ?? '',
      proyecto: parametros.get('proyecto') ?? '',
      desde: parametros.get('desde') ?? '',
      hasta: parametros.get('hasta') ?? '',
      menores: parametros.get('menores') ?? '',
      estado: parametros.get('estado') ?? '',
    }));
  }, []);

  const cargarCatalogo = useCallback(async () => {
    const respuesta = await fetch('/api/photos/ubicaciones');
    if (!respuesta.ok) return;
    const datos = await respuesta.json();
    setCatalogo(Array.isArray(datos.ubicaciones) ? datos.ubicaciones : []);
    setProyectos(Array.isArray(datos.proyectos) ? datos.proyectos : []);
  }, []);

  const cargarFotos = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      const parametros = new URLSearchParams();
      Object.entries(filtros).forEach(([clave, valor]) => { if (valor) parametros.set(clave, valor); });
      if (!esAdmin && proyectoId) parametros.set('proyecto', proyectoId);
      parametros.set('page', String(pagina));
      parametros.set('pageSize', String(TAMANO_PAGINA));
      const respuesta = await fetch(`/api/photos/banco?${parametros.toString()}`);
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo cargar el banco de fotos');
      setFotos(datos.items ?? []);
      setTotal(datos.total ?? 0);
    } catch (error: any) {
      setErrorCarga(error.message);
      setFotos([]);
      setTotal(0);
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina, esAdmin, proyectoId]);

  useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);
  useEffect(() => { cargarFotos(); }, [cargarFotos]);

  // Ubicaciones que esta persona puede usar como destino de "Publicar en…".
  const ubicacionesDisponibles = useMemo(
    () => catalogo.filter((ubicacion) => esAdmin || (!ubicacion.solo_admin && ubicacion.proyecto_id === proyectoId)),
    [catalogo, esAdmin, proyectoId]
  );
  const nombreUbicacion = (slug: string) => catalogo.find((ubicacion) => ubicacion.slug === slug)?.nombre ?? slug;
  const nombreProyecto = (id: string) => proyectos.find((proyecto) => proyecto.id === id)?.nombre_oficial ?? id;

  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));

  const cambiarFiltro = (campo: keyof typeof filtros, valor: string) => {
    setPagina(1);
    setSeleccionadas([]);
    setFiltros((previos) => ({ ...previos, [campo]: valor }));
  };

  const alternarSeleccion = (fotoId: string) => {
    setSeleccionadas((previas) => previas.includes(fotoId) ? previas.filter((id) => id !== fotoId) : [...previas, fotoId]);
  };

  const ejecutarAccion = async (accion: string, ubicaciones?: string[]) => {
    if (seleccionadas.length === 0) return;
    if (accion === 'descartar' && !window.confirm(`¿Descartar ${seleccionadas.length} foto(s)? Salen del sitio y de sus ubicaciones (siguen en el banco).`)) return;
    setMensaje('');
    try {
      const respuesta = await fetch('/api/photos/accion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: seleccionadas, accion, ubicaciones }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        const detalle = Array.isArray(datos.detalle) ? datos.detalle.map((item: any) => item.motivo).join(' · ') : '';
        throw new Error(`${datos.error || 'No se pudo ejecutar la acción'} ${detalle}`.trim());
      }
      const excedidos = (datos.avisos ?? []).filter((aviso: any) => aviso.publicadas > aviso.max_fotos);
      setMensaje(
        excedidos.length > 0
          ? `Listo. Ojo: ${excedidos.map((aviso: any) => `${nombreUbicacion(aviso.slug)} tiene ${aviso.publicadas} fotos y el sitio mostrará solo las primeras ${aviso.max_fotos}`).join('; ')}.`
          : 'Listo.'
      );
      setSeleccionadas([]);
      setUbicacionesParaPublicar([]);
      cargarFotos();
      cargarCatalogo();
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    }
  };

  const alternarUbicacionParaPublicar = (slug: string) => {
    setUbicacionesParaPublicar((previas) => previas.includes(slug) ? previas.filter((s) => s !== slug) : [...previas, slug]);
  };

  return (
    <div className="space-y-6">
      {/* Cupos por ubicación */}
      <section aria-label="Cupos por ubicación" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ubicacionesDisponibles.map((ubicacion) => {
          const publicadas = Number(ubicacion.publicadas);
          const excedido = publicadas > ubicacion.max_fotos;
          return (
            <div key={ubicacion.slug} className={`rounded-lg border p-3 text-sm ${excedido ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <p className="font-semibold text-gray-800">{ubicacion.nombre}</p>
              <p className={excedido ? 'text-red-700' : 'text-gray-600'}>
                {publicadas} / {ubicacion.max_fotos} fotos
              </p>
              {excedido && <p className="text-xs text-red-700">El sitio muestra solo las primeras {ubicacion.max_fotos}.</p>}
            </div>
          );
        })}
      </section>

      {/* Filtros */}
      <section aria-label="Filtros" className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input aria-label="Buscar" placeholder="Buscar por título o descripción" value={filtros.q} onChange={(evento) => cambiarFiltro('q', evento.target.value)} className="rounded border p-2 text-sm" />
        <select aria-label="Origen" value={filtros.origen} onChange={(evento) => cambiarFiltro('origen', evento.target.value)} className="rounded border p-2 text-sm">
          <option value="">Todos los orígenes</option>
          {Object.entries(ETIQUETA_ORIGEN).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
        <select aria-label="Ubicación" value={filtros.ubicacion} onChange={(evento) => cambiarFiltro('ubicacion', evento.target.value)} className="rounded border p-2 text-sm">
          <option value="">Todas las ubicaciones</option>
          <option value="sin_ubicar">Sin ubicar</option>
          {ubicacionesDisponibles.map((ubicacion) => <option key={ubicacion.slug} value={ubicacion.slug}>{ubicacion.nombre}</option>)}
        </select>
        {esAdmin && (
          <select aria-label="Proyecto" value={filtros.proyecto} onChange={(evento) => cambiarFiltro('proyecto', evento.target.value)} className="rounded border p-2 text-sm">
            <option value="">Todos los proyectos</option>
            <option value="sin_proyecto">Sin proyecto</option>
            {proyectos.map((proyecto) => <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre_oficial}</option>)}
          </select>
        )}
        <label className="text-xs text-gray-600">Desde
          <input type="date" value={filtros.desde} onChange={(evento) => cambiarFiltro('desde', evento.target.value)} className="mt-1 w-full rounded border p-2 text-sm" />
        </label>
        <label className="text-xs text-gray-600">Hasta
          <input type="date" value={filtros.hasta} onChange={(evento) => cambiarFiltro('hasta', evento.target.value)} className="mt-1 w-full rounded border p-2 text-sm" />
        </label>
        {esAdmin && (
          <select aria-label="Menores" value={filtros.menores} onChange={(evento) => cambiarFiltro('menores', evento.target.value)} className="rounded border p-2 text-sm">
            <option value="">Con o sin menores</option>
            <option value="no">Sin menores</option>
            <option value="revisar">Por revisar</option>
            <option value="si">Con menores</option>
          </select>
        )}
        <select aria-label="Estado" value={filtros.estado} onChange={(evento) => cambiarFiltro('estado', evento.target.value)} className="rounded border p-2 text-sm">
          <option value="">Cualquier estado</option>
          <option value="publicada">Publicadas</option>
          <option value="sin_ubicar">Sin ubicar</option>
          <option value="oculta">Ocultas</option>
        </select>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{total} foto(s) — página {pagina} de {totalPaginas}</p>
        <button type="button" onClick={() => setMostrarSubida(true)} className="rounded bg-uleam-blue px-4 py-2 text-sm font-semibold text-white hover:bg-uleam-blue/90">
          + Subir foto
        </button>
      </div>

      {mensaje && <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status">{mensaje}</div>}

      {/* Barra de acciones en lote */}
      {seleccionadas.length > 0 && (
        <section aria-label="Acciones en lote" className="sticky top-2 z-10 space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow">
          <p className="text-sm font-semibold text-indigo-900">{seleccionadas.length} seleccionada(s)</p>
          <div className="flex flex-wrap gap-2">
            {ubicacionesDisponibles.map((ubicacion) => (
              <label key={ubicacion.slug} className="flex cursor-pointer items-center gap-1 rounded border bg-white px-2 py-1 text-xs">
                <input type="checkbox" checked={ubicacionesParaPublicar.includes(ubicacion.slug)} onChange={() => alternarUbicacionParaPublicar(ubicacion.slug)} />
                {ubicacion.nombre}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" disabled={ubicacionesParaPublicar.length === 0} onClick={() => ejecutarAccion('publicar', ubicacionesParaPublicar)} className="rounded bg-green-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40">Publicar en…</button>
            <button type="button" disabled={ubicacionesParaPublicar.length === 0} onClick={() => ejecutarAccion('quitar', ubicacionesParaPublicar)} className="rounded bg-amber-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40">Quitar de…</button>
            <button type="button" onClick={() => ejecutarAccion('ocultar')} className="rounded bg-gray-600 px-3 py-1.5 font-semibold text-white">Ocultar</button>
            <button type="button" onClick={() => ejecutarAccion('mostrar')} className="rounded bg-gray-500 px-3 py-1.5 font-semibold text-white">Mostrar</button>
            <button type="button" onClick={() => ejecutarAccion('descartar')} className="rounded bg-red-600 px-3 py-1.5 font-semibold text-white">Descartar</button>
            {esAdmin && (
              <>
                <button type="button" onClick={() => ejecutarAccion('marcar_revisada')} className="rounded bg-teal-600 px-3 py-1.5 font-semibold text-white">Marcar sin menores (revisada)</button>
                <button type="button" onClick={() => ejecutarAccion('marcar_interna')} className="rounded bg-rose-700 px-3 py-1.5 font-semibold text-white">Marcar con menores (interna)</button>
              </>
            )}
            <button type="button" onClick={() => setSeleccionadas([])} className="rounded border px-3 py-1.5">Limpiar selección</button>
          </div>
          <p className="text-xs text-gray-600">Las fotos con menores no se pueden publicar. Si pasas el máximo de una ubicación, el sitio muestra solo las primeras.</p>
        </section>
      )}

      {/* Cuadrícula */}
      {errorCarga && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorCarga} <button type="button" className="underline" onClick={cargarFotos}>Reintentar</button></div>}
      {cargando ? (
        <p className="text-sm text-gray-500">Cargando fotos…</p>
      ) : fotos.length === 0 && !errorCarga ? (
        <p className="rounded border border-dashed p-8 text-center text-sm text-gray-500">No hay fotos con estos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fotos.map((foto) => (
            <article key={foto.id} className={`overflow-hidden rounded-lg border bg-white shadow-sm ${seleccionadas.includes(foto.id) ? 'ring-2 ring-indigo-500' : ''}`}>
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.miniatura || foto.url} alt={foto.titulo || 'Foto del banco'} loading="lazy" className="h-40 w-full object-cover" style={{ objectPosition: `center ${foto.posicion ?? 50}%` }} />
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${foto.titulo || foto.id}`}
                  checked={seleccionadas.includes(foto.id)}
                  onChange={() => alternarSeleccion(foto.id)}
                  className="absolute left-2 top-2 h-5 w-5"
                />
              </div>
              <div className="space-y-1 p-3 text-xs">
                <p className="truncate font-semibold text-gray-800">{foto.titulo || 'Sin título'}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5">{ETIQUETA_ORIGEN[foto.origen] ?? foto.origen}</span>
                  {foto.menores !== 'no' && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-800">
                      {foto.menores === 'si' ? 'Con menores' : 'Menores: revisar'}
                    </span>
                  )}
                  {!foto.activo && <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-800">Oculta</span>}
                  {foto.ubicaciones.length === 0 && foto.menores === 'no' && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">Sin ubicar</span>}
                </div>
                {foto.ubicaciones.length > 0 && <p className="text-gray-600">📍 {foto.ubicaciones.map(nombreUbicacion).join(' · ')}</p>}
                {foto.proyectos.length > 0 && <p className="text-gray-500">🗂 {foto.proyectos.map(nombreProyecto).join(' · ')}</p>}
                <button type="button" onClick={() => setFotoEnEdicion(foto)} className="mt-1 text-indigo-700 underline">Editar</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Paginación">
        <button type="button" disabled={pagina <= 1} onClick={() => setPagina((actual) => actual - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button>
        <span>{pagina} / {totalPaginas}</span>
        <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((actual) => actual + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button>
      </nav>

      {fotoEnEdicion && (
        <ModalEditarFoto
          foto={fotoEnEdicion}
          esAdmin={esAdmin}
          proyectos={proyectos}
          onCerrar={() => setFotoEnEdicion(null)}
          onGuardado={() => { setFotoEnEdicion(null); cargarFotos(); cargarCatalogo(); }}
        />
      )}
      {mostrarSubida && (
        <ModalSubirFoto
          esAdmin={esAdmin}
          proyectoId={proyectoId}
          proyectos={proyectos}
          ubicaciones={ubicacionesDisponibles}
          onCerrar={() => setMostrarSubida(false)}
          onSubida={() => { setMostrarSubida(false); cargarFotos(); cargarCatalogo(); }}
        />
      )}
    </div>
  );
}

// ───────────────────────── Editar ─────────────────────────

function ModalEditarFoto({ foto, esAdmin, proyectos, onCerrar, onGuardado }: {
  foto: FotoBanco; esAdmin: boolean; proyectos: ProyectoBasico[]; onCerrar: () => void; onGuardado: () => void;
}) {
  const [titulo, setTitulo] = useState(foto.titulo ?? '');
  const [descripcion, setDescripcion] = useState(foto.descripcion ?? '');
  const [orden, setOrden] = useState(foto.order);
  const [posicion, setPosicion] = useState(foto.posicion ?? 50);
  const [proyectosFoto, setProyectosFoto] = useState<string[]>(foto.proyectos);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      const respuesta = await fetch(`/api/photos/${foto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descripcion, order: orden, posicion, ...(esAdmin ? { proyectos: proyectosFoto } : {}) }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar');
      onGuardado();
    } catch (falla: any) {
      setError(falla.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar la foto definitivamente (también de Cloudinary)? Esto no se puede deshacer.')) return;
    const respuesta = await fetch(`/api/photos/${foto.id}`, { method: 'DELETE' });
    if (respuesta.ok) onGuardado(); else setError('No se pudo eliminar');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Editar foto">
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold">Editar foto</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto.miniatura || foto.url} alt="" className="h-40 w-full rounded object-cover" style={{ objectPosition: `center ${posicion}%` }} />
        <label className="block text-sm">Título<input value={titulo} onChange={(evento) => setTitulo(evento.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">Descripción<textarea value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} rows={2} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">Recorte vertical ({posicion}%)
          <input type="range" min={0} max={100} value={posicion} onChange={(evento) => setPosicion(Number(evento.target.value))} className="w-full" />
        </label>
        <label className="block text-sm">Orden dentro de la ubicación (menor = primero)
          <input type="number" value={orden} onChange={(evento) => setOrden(Number(evento.target.value))} className="mt-1 w-full rounded border p-2" />
        </label>
        {esAdmin && (
          <fieldset className="text-sm">
            <legend className="font-medium">Proyectos a los que pertenece</legend>
            <div className="mt-1 grid gap-1">
              {proyectos.map((proyecto) => (
                <label key={proyecto.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={proyectosFoto.includes(proyecto.id)} onChange={() => setProyectosFoto((previos) => previos.includes(proyecto.id) ? previos.filter((id) => id !== proyecto.id) : [...previos, proyecto.id])} />
                  {proyecto.nombre_oficial}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-between gap-2">
          {esAdmin ? <button type="button" onClick={eliminar} className="rounded border border-red-300 px-3 py-2 text-sm text-red-700">Eliminar</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="rounded border px-4 py-2 text-sm">Cancelar</button>
            <button type="button" disabled={guardando} onClick={guardar} className="rounded bg-uleam-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Subir ─────────────────────────

function ModalSubirFoto({ esAdmin, proyectoId, proyectos, ubicaciones, onCerrar, onSubida }: {
  esAdmin: boolean; proyectoId?: string; proyectos: ProyectoBasico[]; ubicaciones: UbicacionCatalogo[]; onCerrar: () => void; onSubida: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [proyectosFoto, setProyectosFoto] = useState<string[]>(proyectoId ? [proyectoId] : []);
  const [ubicacionesFoto, setUbicacionesFoto] = useState<string[]>([]);
  const [hayMenores, setHayMenores] = useState(false);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  const subir = async () => {
    if (!archivo) { setError('Elige una foto.'); return; }
    if (!esAdmin && proyectosFoto.length === 0) { setError('Indica el proyecto.'); return; }
    setSubiendo(true);
    setError('');
    try {
      const datosArchivo = new FormData();
      datosArchivo.append('file', archivo);
      const subida = await fetch('/api/upload', { method: 'POST', body: datosArchivo });
      const resultado = await subida.json();
      if (!subida.ok) throw new Error(resultado.error || 'Error subiendo la foto');
      const respuesta = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: resultado.url, cloudinary_public_id: resultado.public_id, titulo, descripcion,
          proyectos: proyectosFoto, ubicaciones: hayMenores ? [] : ubicacionesFoto, hay_menores: hayMenores,
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo registrar la foto');
      onSubida();
    } catch (falla: any) {
      setError(falla.message);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Subir foto">
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-white p-6">
        <h2 className="text-lg font-bold">Subir foto</h2>
        <input type="file" accept="image/*,.heic,.heif" onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)} className="text-sm" />
        <label className="block text-sm">Título<input value={titulo} onChange={(evento) => setTitulo(evento.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">Descripción<textarea value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} rows={2} className="mt-1 w-full rounded border p-2" /></label>
        {esAdmin && (
          <fieldset className="text-sm">
            <legend className="font-medium">Proyectos (opcional)</legend>
            <div className="mt-1 grid gap-1">
              {proyectos.map((proyecto) => (
                <label key={proyecto.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={proyectosFoto.includes(proyecto.id)} onChange={() => setProyectosFoto((previos) => previos.includes(proyecto.id) ? previos.filter((id) => id !== proyecto.id) : [...previos, proyecto.id])} />
                  {proyecto.nombre_oficial}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={hayMenores} onChange={(evento) => setHayMenores(evento.target.checked)} />
          <span>¿Aparecen menores de edad en la foto?<span className="block text-xs text-gray-500">Si marcas Sí, la foto no se publicará en la web.</span></span>
        </label>
        {!hayMenores && (
          <fieldset className="text-sm">
            <legend className="font-medium">Publicar directamente en (opcional)</legend>
            <div className="mt-1 grid gap-1">
              {ubicaciones.map((ubicacion) => (
                <label key={ubicacion.slug} className="flex items-center gap-2">
                  <input type="checkbox" checked={ubicacionesFoto.includes(ubicacion.slug)} onChange={() => setUbicacionesFoto((previas) => previas.includes(ubicacion.slug) ? previas.filter((s) => s !== ubicacion.slug) : [...previas, ubicacion.slug])} />
                  {ubicacion.nombre}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="rounded border px-4 py-2 text-sm">Cancelar</button>
          <button type="button" disabled={subiendo} onClick={subir} className="rounded bg-uleam-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{subiendo ? 'Subiendo…' : 'Subir'}</button>
        </div>
      </div>
    </div>
  );
}
