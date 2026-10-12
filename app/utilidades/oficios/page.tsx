"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { etiquetaPersona, nombreConGrados } from "../_lib/formatoPersona";

interface Docente {
  id: number;
  titulo_grado: string;
  nombre: string;
  post_grado: string;
  cargo: string;
  carrera: string;
}

interface Firmante {
  docenteId: string;
  titulo: string;
  nombre: string;
  cargo: string;
}

function firmanteVacio(): Firmante {
  return { docenteId: "", titulo: "", nombre: "", cargo: "" };
}

const TONOS = [
  { value: "formal", label: "🎩 Formal" },
  { value: "cordial", label: "🤝 Cordial" },
  { value: "directo", label: "🎯 Directo" },
  { value: "urgente", label: "⚡ Urgente" },
];

async function enriquecer(contexto: string, texto: string, tono?: string): Promise<string> {
  const r = await fetch("/utilidades/api/ia-enriquecer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contexto, texto, tono }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Error de IA");
  return d.texto_enriquecido;
}

export default function OficiosPage() {
  const [carreras, setCarreras] = useState<string[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [carreraFiltro, setCarreraFiltro] = useState("");

  const [numOficio, setNumOficio] = useState("");
  const [ciudad, setCiudad] = useState("Manta");
  const [fecha, setFecha] = useState("");
  const [tono, setTono] = useState("formal");

  const [destinatarioNombre, setDestinatarioNombre] = useState("");
  const [destinatarioCargo, setDestinatarioCargo] = useState("");
  const [destinatarioCarrera, setDestinatarioCarrera] = useState("");

  // CC: una línea de texto por persona. Filtro y lista propios, independientes del destinatario,
  // para poder copiar a personas de cualquier dependencia sin tocar el filtro de arriba.
  const [copias, setCopias] = useState<string[]>([]);
  const [ccCarreraFiltro, setCcCarreraFiltro] = useState("");
  const [docentesCc, setDocentesCc] = useState<Docente[]>([]);
  const [copiaManual, setCopiaManual] = useState("");

  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [iaStatus, setIaStatus] = useState<{ texto: string; color: string } | null>(null);

  const [firmantes, setFirmantes] = useState<Firmante[]>([firmanteVacio()]);
  const [autoseleccionRealizada, setAutoseleccionRealizada] = useState(false);
  const [iniciales, setIniciales] = useState("");

  const [miId, setMiId] = useState<string | null>(null);

  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetch("/utilidades/oficios/api/carreras")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCarreras(Array.isArray(data) ? data : []))
      .catch(() => setCarreras([]));
  }, []);

  useEffect(() => {
    const url = carreraFiltro
      ? `/utilidades/oficios/api/destinatarios?carrera=${encodeURIComponent(carreraFiltro)}`
      : "/utilidades/oficios/api/destinatarios";
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDocentes(Array.isArray(data) ? data : []))
      .catch(() => setDocentes([]));
  }, [carreraFiltro]);

  useEffect(() => {
    const url = ccCarreraFiltro
      ? `/utilidades/oficios/api/destinatarios?carrera=${encodeURIComponent(ccCarreraFiltro)}`
      : "/utilidades/oficios/api/destinatarios";
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDocentesCc(Array.isArray(data) ? data : []))
      .catch(() => setDocentesCc([]));
  }, [ccCarreraFiltro]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMiId(data?.usuario?.id ?? null))
      .catch(() => setMiId(null));
  }, []);

  // Autoselecciona al usuario logueado como firmante (sigue pudiendo cambiarse).
  useEffect(() => {
    if (!miId || autoseleccionRealizada) return;
    if (docentes.some((d) => String(d.id) === miId)) {
      seleccionarFirmante(0, miId);
      setAutoseleccionRealizada(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miId, docentes]);

  function agregarDestinatario(id: string) {
    const d = docentes.find((x) => String(x.id) === id);
    if (!d) return;
    setDestinatarioNombre((prev) => (prev ? `${prev}\n${d.nombre}` : d.nombre));
    setDestinatarioCargo((prev) => (prev ? `${prev}\n${d.cargo}` : d.cargo));
    setDestinatarioCarrera((prev) => (prev ? `${prev}\n${d.carrera}` : d.carrera));
  }

  function agregarLineaCopia(linea: string) {
    const limpia = linea.replace(/\s+/g, " ").trim();
    if (!limpia) return;
    setCopias((previas) =>
      previas.some((existente) => existente.toLowerCase() === limpia.toLowerCase()) ? previas : [...previas, limpia]
    );
  }

  function agregarCopia(id: string) {
    const d = docentesCc.find((x) => String(x.id) === id);
    if (!d) return;
    agregarLineaCopia(d.cargo ? `${nombreConGrados(d)} - ${d.cargo}` : nombreConGrados(d));
  }

  function agregarCopiaManual() {
    agregarLineaCopia(copiaManual);
    setCopiaManual("");
  }

  function quitarCopia(copiaIndex: number) {
    setCopias((previas) => previas.filter((_, index) => index !== copiaIndex));
  }

  function actualizarFirmante(firmanteIndex: number, cambios: Partial<Firmante>) {
    setFirmantes((previos) =>
      previos.map((firmante, index) => (index === firmanteIndex ? { ...firmante, ...cambios } : firmante))
    );
  }

  function seleccionarFirmante(firmanteIndex: number, docenteId: string) {
    const docente = docentes.find((x) => String(x.id) === docenteId);
    if (!docente) return;
    actualizarFirmante(firmanteIndex, {
      docenteId,
      titulo: docente.titulo_grado,
      nombre: docente.nombre,
      cargo: docente.cargo,
    });
  }

  function agregarFirmante() {
    setFirmantes((previos) => [...previos, firmanteVacio()]);
  }

  function quitarFirmante(firmanteIndex: number) {
    setFirmantes((previos) => previos.filter((_, index) => index !== firmanteIndex));
  }

  async function mejorarConIA() {
    if (!asunto && !cuerpo) {
      setIaStatus({ texto: "⚠️ Escribe algo primero.", color: "text-red-600" });
      return;
    }
    setIaStatus({ texto: "⏳ Procesando...", color: "text-slate-500" });
    try {
      if (asunto.trim().length >= 3) {
        setAsunto(await enriquecer("oficio_asunto", asunto));
      }
      if (cuerpo.trim().length >= 3) {
        setCuerpo(await enriquecer("oficio_cuerpo", cuerpo, tono));
      } else if (asunto.trim().length >= 3) {
        setCuerpo(await enriquecer("oficio_cuerpo_generar", asunto, tono));
      }
      setIaStatus({ texto: "✅ Enriquecido. Puedes editar.", color: "text-green-600" });
    } catch (e) {
      setIaStatus({ texto: `❌ ${(e as Error).message}`, color: "text-red-600" });
    }
  }

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setGenerando(true);
    try {
      const fd = new FormData();
      fd.set("num_oficio", numOficio);
      fd.set("ciudad", ciudad);
      fd.set("fecha_emision", fecha);
      fd.set("destinatario_nombre", destinatarioNombre);
      fd.set("destinatario_cargo", destinatarioCargo);
      fd.set("destinatario_carrera", destinatarioCarrera);
      fd.set("copia_a", copias.join("\n"));
      fd.set("asunto", asunto);
      fd.set("cuerpo", cuerpo);
      fd.set(
        "firmantes",
        JSON.stringify(firmantes.map(({ titulo, nombre, cargo }) => ({ titulo, nombre, cargo })))
      );
      fd.set("iniciales", iniciales);

      const r = await fetch("/utilidades/oficios/api", { method: "POST", body: fd });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(d.error);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Oficio_${numOficio || "borrador"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Error al generar el oficio: ${(e as Error).message}`);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex gap-4">
        <Link href="/utilidades" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver a Utilidades
        </Link>
        <Link href="/portal/dashboard" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver al Portal PINE
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-[#003366]">📄 Generador de Oficios</h1>

      <form onSubmit={generar} className="space-y-6">
        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">Identificación del Oficio</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              N.º Oficio
              <input required value={numOficio} onChange={(e) => setNumOficio(e.target.value)}
                placeholder="Ej: OFICIO-001-2026" className="ht-input" />
            </label>
            <label className="block text-sm">
              Ciudad
              <input required value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="ht-input" />
            </label>
            <label className="block text-sm">
              Fecha de emisión
              <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="ht-input" />
            </label>
            <label className="block text-sm">
              Tono del oficio
              <select value={tono} onChange={(e) => setTono(e.target.value)} className="ht-input">
                {TONOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">Destinatario</legend>
          <label className="mb-3 block text-sm">
            Filtrar por carrera/dependencia
            <select value={carreraFiltro} onChange={(e) => setCarreraFiltro(e.target.value)} className="ht-input">
              <option value="">-- Todas las carreras/dependencias --</option>
              {carreras.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="mb-3 block text-sm">
            Seleccione el destinatario
            <select defaultValue="" onChange={(e) => { agregarDestinatario(e.target.value); e.target.value = ""; }} className="ht-input">
              <option value="" disabled>-- Seleccione un destinatario --</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>{etiquetaPersona(d)}</option>
              ))}
            </select>
          </label>
          <label className="mb-3 block text-sm">
            Nombre completo
            <textarea required rows={2} value={destinatarioNombre} onChange={(e) => setDestinatarioNombre(e.target.value)} className="ht-input" />
          </label>
          <label className="mb-3 block text-sm">
            Cargo
            <textarea required rows={2} value={destinatarioCargo} onChange={(e) => setDestinatarioCargo(e.target.value)} className="ht-input" />
          </label>
          <label className="block text-sm">
            Carrera/Dependencia
            <textarea required rows={2} value={destinatarioCarrera} onChange={(e) => setDestinatarioCarrera(e.target.value)} className="ht-input" />
          </label>
          <p className="mt-2 text-xs text-slate-500">* Seleccione un destinatario de la lista para agregarlo. Puede seleccionar varios o editar el texto libremente.</p>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">Con copia a (CC)</legend>
          <label className="mb-3 block text-sm">
            Filtrar por carrera/dependencia
            <select value={ccCarreraFiltro} onChange={(e) => setCcCarreraFiltro(e.target.value)} className="ht-input">
              <option value="">-- Todas las carreras/dependencias --</option>
              {carreras.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="mb-3 block text-sm">
            Agregar desde el directorio
            <select value="" onChange={(e) => agregarCopia(e.target.value)} className="ht-input">
              <option value="" disabled>-- Seleccione alguien para añadir a CC --</option>
              {docentesCc.map((d) => (
                <option key={d.id} value={d.id}>{etiquetaPersona(d)}</option>
              ))}
            </select>
          </label>
          <div className="mb-3">
            <label className="block text-sm" htmlFor="copia-manual">
              O escribir a mano (persona que no está en el directorio)
            </label>
            <div className="flex gap-2">
              <input
                id="copia-manual"
                value={copiaManual}
                onChange={(e) => setCopiaManual(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarCopiaManual(); } }}
                placeholder="Ej: Lic. Ana Mora, Mg. - Directora de Bienestar Estudiantil"
                className="ht-input"
              />
              <button type="button" onClick={agregarCopiaManual} className="mt-1 rounded bg-slate-200 px-3 text-sm">Agregar</button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              * ¿Será frecuente? <Link href="/utilidades/directorio" className="text-[#003366] underline">Agrégala al directorio</Link> para elegirla desde la lista.
            </p>
          </div>
          {copias.length === 0 ? (
            <p className="text-sm text-slate-500">Sin copias: el oficio saldrá sin sección «Con copia a».</p>
          ) : (
            <ul className="space-y-1">
              {copias.map((copia, copiaIndex) => (
                <li key={copia} className="flex items-center justify-between gap-2 rounded bg-slate-100 px-3 py-1 text-sm">
                  <span>{copia}</span>
                  <button type="button" onClick={() => quitarCopia(copiaIndex)} aria-label={`Quitar ${copia}`}
                    className="rounded bg-red-100 px-2 text-xs text-red-700">✕</button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">Contenido del Oficio</legend>
          <label className="mb-3 block text-sm">
            Asunto
            <input required value={asunto} onChange={(e) => setAsunto(e.target.value)}
              placeholder="Resumen breve del oficio" className="ht-input" />
          </label>
          <label className="block text-sm">
            Cuerpo del oficio
            <textarea required rows={8} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)}
              placeholder="Detalle del contenido del oficio..." className="ht-input" />
          </label>
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-3">
            <button type="button" onClick={mejorarConIA} className="rounded bg-green-600 px-4 py-1.5 text-sm font-semibold text-white">
              ✨ Mejorar con IA
            </button>
            {iaStatus && <span className={`text-sm ${iaStatus.color}`}>{iaStatus.texto}</span>}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">Firmantes</legend>
          <p className="mb-3 text-xs text-slate-500">* Elija de la lista para autocompletar, o escriba directamente si la persona no está en la lista. Use «Agregar otro firmante» si el oficio lo firman varias personas.</p>
          {firmantes.map((firmante, firmanteIndex) => (
            <div key={firmanteIndex} className="mb-4 rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Firmante {firmanteIndex + 1}</span>
                {firmantes.length > 1 && (
                  <button type="button" onClick={() => quitarFirmante(firmanteIndex)} className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    Quitar
                  </button>
                )}
              </div>
              <label className="mb-3 block text-sm">
                Seleccione de la lista
                <select
                  value={firmante.docenteId}
                  onChange={(e) => seleccionarFirmante(firmanteIndex, e.target.value)}
                  className="ht-input"
                >
                  <option value="">-- Seleccione un firmante (o escriba abajo) --</option>
                  {docentes.map((d) => (
                    <option key={d.id} value={d.id}>{etiquetaPersona(d)}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block text-sm">Título<input required value={firmante.titulo} onChange={(e) => actualizarFirmante(firmanteIndex, { titulo: e.target.value, docenteId: "" })} className="ht-input" /></label>
                <label className="block text-sm">Nombre completo<input required value={firmante.nombre} onChange={(e) => actualizarFirmante(firmanteIndex, { nombre: e.target.value, docenteId: "" })} className="ht-input" /></label>
                <label className="block text-sm">Cargo<input required value={firmante.cargo} onChange={(e) => actualizarFirmante(firmanteIndex, { cargo: e.target.value, docenteId: "" })} className="ht-input" /></label>
              </div>
            </div>
          ))}
          <button type="button" onClick={agregarFirmante} className="rounded bg-slate-200 px-3 py-1 text-sm">
            + Agregar otro firmante
          </button>
          <label className="mt-3 block text-sm">
            Iniciales elaborador
            <input required value={iniciales} onChange={(e) => setIniciales(e.target.value)} placeholder="Ej: ARZ/ddm" className="ht-input" />
          </label>
        </fieldset>

        <button type="submit" disabled={generando}
          className="w-full rounded-lg bg-[#003366] py-3 font-semibold text-white disabled:opacity-50">
          {generando ? "Generando..." : "📄 Generar Oficio"}
        </button>
      </form>
    </main>
  );
}
