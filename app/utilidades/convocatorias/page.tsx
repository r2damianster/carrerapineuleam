"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface Docente {
  id: number;
  titulo_grado: string;
  nombre: string;
  post_grado: string;
  cargo: string;
  carrera: string;
}

interface DocenteManual {
  titulo: string;
  nombre: string;
  postgrado: string;
  cargo: string;
}

const PERIODOS = ["2026-1", "2026-2"];
const CARRERAS = [
  "Pedagogía de los Idiomas Nacionales y Extranjeros",
  "Psicología Educativa",
  "Educación Básica",
  "Educación Inicial",
];
const CARRERA_OTRA = "__otra__";

interface EstudianteEditable { nombre: string; correo: string }
interface GrupoLista {
  clave: string;
  archivo: string;
  carrera: string;
  carreraOtra: string;
  asignatura: string;
  paralelo: string;
  advertencias: string[];
  estudiantes: EstudianteEditable[];
}
interface ListaAnalizada {
  archivo: string;
  asignatura: string;
  paralelo: string;
  periodo: string;
  advertencias: string[];
  estudiantes: EstudianteEditable[];
}

async function enriquecer(contexto: string, texto: string): Promise<string> {
  const r = await fetch("/utilidades/api/ia-enriquecer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contexto, texto }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Error de IA");
  return d.texto_enriquecido;
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ConvocatoriasPage() {
  const [tab, setTab] = useState<"docente" | "estudiante">("docente");
  const [docentes, setDocentes] = useState<Docente[]>([]);

  useEffect(() => {
    fetch("/utilidades/api/docentes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDocentes(Array.isArray(data) ? data : []))
      .catch(() => setDocentes([]));
  }, []);

  const carreras = useMemo(() => Array.from(new Set(docentes.map((d) => d.carrera))), [docentes]);

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
      <h1 className="mb-6 text-2xl font-bold text-[#003366]">📢 Convocatorias</h1>
      <div className="mb-6 flex gap-2">
        <button onClick={() => setTab("docente")}
          className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === "docente" ? "bg-[#003366] text-white" : "bg-slate-100 text-slate-600"}`}>
          👨‍🏫 A Docentes
        </button>
        <button onClick={() => setTab("estudiante")}
          className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === "estudiante" ? "bg-[#003366] text-white" : "bg-slate-100 text-slate-600"}`}>
          🎓 A Estudiantes
        </button>
      </div>
      {tab === "docente"
        ? <FormDocentes docentes={docentes} carreras={carreras} />
        : <FormEstudiantes />}
    </main>
  );
}

function FormDocentes({ docentes, carreras }: { docentes: Docente[]; carreras: string[] }) {
  const [numConvocatoria, setNumConvocatoria] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [ciudad, setCiudad] = useState("Manta");
  const [fecha, setFecha] = useState("");

  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [iaStatus, setIaStatus] = useState<{ texto: string; color: string } | null>(null);

  const [fechaReunion, setFechaReunion] = useState("");
  const [horaReunion, setHoraReunion] = useState("");
  const [lugarReunion, setLugarReunion] = useState("");

  const [modo, setModo] = useState<"carrera" | "manual">("carrera");
  const [carreraSeleccionada, setCarreraSeleccionada] = useState("");
  const [manuales, setManuales] = useState<DocenteManual[]>([]);
  const [manualTitulo, setManualTitulo] = useState("Lic.");
  const [manualNombre, setManualNombre] = useState("");
  const [manualPostgrado, setManualPostgrado] = useState("Mg.");
  const [manualCargo, setManualCargo] = useState("Docente");

  const [convocanteId, setConvocanteId] = useState("");
  const [convocanteTitulo, setConvocanteTitulo] = useState("");
  const [convocanteNombre, setConvocanteNombre] = useState("");
  const [convocanteCargo, setConvocanteCargo] = useState("");
  const [inicialesElaborador, setInicialesElaborador] = useState("");
  const [generando, setGenerando] = useState(false);

  const [miId, setMiId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMiId(data?.usuario?.id ?? null))
      .catch(() => setMiId(null));
  }, []);

  // Autoselecciona al usuario logueado como convocante (sigue pudiendo cambiarse).
  // Setea los campos directo desde el docente (no vía seleccionarConvocante/opcionesConvocante,
  // que todavía reflejarían el carreraSeleccionada anterior a este mismo render).
  useEffect(() => {
    if (!miId || convocanteId || modo !== "carrera") return;
    const miDocente = docentes.find((d) => String(d.id) === miId);
    if (!miDocente) return;
    setCarreraSeleccionada(miDocente.carrera);
    setConvocanteId(String(miDocente.id));
    setConvocanteTitulo(miDocente.titulo_grado);
    setConvocanteNombre(miDocente.nombre);
    setConvocanteCargo(miDocente.cargo);
  }, [miId, docentes, convocanteId, modo]);

  const docentesCarrera = docentes.filter((d) => d.carrera === carreraSeleccionada);
  const opcionesConvocante = modo === "carrera"
    ? docentesCarrera.map((d) => ({ id: String(d.id), titulo: d.titulo_grado, nombre: d.nombre, postgrado: d.post_grado, cargo: d.cargo }))
    : manuales.map((d, i) => ({ id: `manual_${i}`, titulo: d.titulo, nombre: d.nombre, postgrado: d.postgrado, cargo: d.cargo }));

  function seleccionarConvocante(id: string) {
    setConvocanteId(id);
    const opcion = opcionesConvocante.find((o) => o.id === id);
    if (!opcion) return;
    setConvocanteTitulo(opcion.titulo);
    setConvocanteNombre(opcion.nombre);
    setConvocanteCargo(opcion.cargo);
  }

  function agregarManual() {
    if (!manualNombre.trim()) { alert("El nombre es obligatorio"); return; }
    setManuales((prev) => [...prev, { titulo: manualTitulo, nombre: manualNombre, postgrado: manualPostgrado, cargo: manualCargo }]);
    setManualNombre("");
  }

  async function mejorarConIA() {
    if (!asunto && !descripcion) {
      setIaStatus({ texto: "⚠️ Escribe algo primero.", color: "text-red-600" });
      return;
    }
    setIaStatus({ texto: "⏳ Procesando...", color: "text-slate-500" });
    try {
      if (asunto.trim().length >= 3) setAsunto(await enriquecer("convocatoria_asunto", asunto));
      if (descripcion.trim().length >= 3) {
        setDescripcion(await enriquecer("convocatoria_descripcion", descripcion));
      } else if (asunto.trim().length >= 3) {
        setDescripcion(await enriquecer("convocatoria_descripcion_generar", asunto));
      }
      setIaStatus({ texto: "✅ Enriquecido. Puedes editar.", color: "text-green-600" });
    } catch (e) {
      setIaStatus({ texto: `❌ ${(e as Error).message}`, color: "text-red-600" });
    }
  }

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    if (modo === "manual" && manuales.length === 0) {
      alert("Agregue al menos un docente");
      return;
    }
    setGenerando(true);
    try {
      const fd = new FormData();
      fd.set("num_convocatoria", numConvocatoria);
      fd.set("periodo", periodo);
      fd.set("ciudad", ciudad);
      fd.set("fecha_larga", fecha);
      fd.set("asunto", asunto);
      fd.set("descripcion_convocatoria", descripcion);
      fd.set("fecha_reunion", fechaReunion);
      fd.set("hora_reunion", horaReunion);
      fd.set("lugar_reunion", lugarReunion);
      fd.set("convocante_titulo", convocanteTitulo);
      fd.set("convocante_nombre", convocanteNombre);
      fd.set("convocante_cargo", convocanteCargo);
      fd.set("iniciales_elaborador", inicialesElaborador);
      fd.set("modo_docentes", modo);
      if (modo === "manual") fd.set("docentes_json", JSON.stringify(manuales));

      const r = await fetch("/utilidades/convocatorias/api/docente", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({ error: "Error desconocido" }))).error);
      descargarBlob(await r.blob(), "Convocatoria_Docentes.docx");
    } catch (e) {
      alert(`Error al generar la convocatoria: ${(e as Error).message}`);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <form onSubmit={generar} className="space-y-6">
      <fieldset className="rounded-lg border border-slate-300 p-4">
        <legend className="px-2 font-semibold text-[#003366]">Identificación</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">N.º Convocatoria<input required value={numConvocatoria} onChange={(e) => setNumConvocatoria(e.target.value)} placeholder="Ej: 001" className="ht-input" /></label>
          <label className="text-sm">Periodo
            <select required value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="ht-input">
              <option value="" disabled>Seleccione...</option>
              {PERIODOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-sm">Ciudad<input required value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="ht-input" /></label>
          <label className="text-sm">Fecha de emisión<input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="ht-input" /></label>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-300 p-4">
        <legend className="px-2 font-semibold text-[#003366]">Datos de la reunión</legend>
        <label className="mb-3 block text-sm">Asunto<input required value={asunto} onChange={(e) => setAsunto(e.target.value)} className="ht-input" /></label>
        <label className="block text-sm">Descripción<textarea required rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="ht-input" /></label>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-3">
          <button type="button" onClick={mejorarConIA} className="rounded bg-green-600 px-4 py-1.5 text-sm font-semibold text-white">✨ Mejorar con IA</button>
          {iaStatus && <span className={`text-sm ${iaStatus.color}`}>{iaStatus.texto}</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">Fecha del evento<input required type="date" value={fechaReunion} onChange={(e) => setFechaReunion(e.target.value)} className="ht-input" /></label>
          <label className="text-sm">Hora<input required type="time" value={horaReunion} onChange={(e) => setHoraReunion(e.target.value)} className="ht-input" /></label>
          <label className="col-span-2 text-sm">Lugar<input required value={lugarReunion} onChange={(e) => setLugarReunion(e.target.value)} className="ht-input" /></label>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-300 p-4">
        <legend className="px-2 font-semibold text-[#003366]">Docentes participantes</legend>
        <div className="mb-4 flex gap-6 text-sm font-semibold">
          <label className="flex items-center gap-2"><input type="radio" checked={modo === "carrera"} onChange={() => setModo("carrera")} /> 📋 Docentes de la carrera</label>
          <label className="flex items-center gap-2"><input type="radio" checked={modo === "manual"} onChange={() => setModo("manual")} /> ✏️ Ingresar manualmente</label>
        </div>

        {modo === "carrera" ? (
          <label className="block text-sm">Carrera
            <select value={carreraSeleccionada} onChange={(e) => setCarreraSeleccionada(e.target.value)} className="ht-input">
              <option value="" disabled>-- Seleccione carrera --</option>
              {carreras.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {carreraSeleccionada && <p className="mt-2 text-xs text-slate-500">{docentesCarrera.length} docentes en esta carrera</p>}
          </label>
        ) : (
          <div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <input value={manualTitulo} onChange={(e) => setManualTitulo(e.target.value)} placeholder="Título (Lic., Dr.)" className="ht-input" />
              <input value={manualNombre} onChange={(e) => setManualNombre(e.target.value)} placeholder="Nombre completo" className="ht-input" />
              <input value={manualPostgrado} onChange={(e) => setManualPostgrado(e.target.value)} placeholder="Post-grado (Mg., PhD.)" className="ht-input" />
            </div>
            <div className="mb-3 grid grid-cols-[2fr_1fr] gap-2">
              <input value={manualCargo} onChange={(e) => setManualCargo(e.target.value)} placeholder="Cargo" className="ht-input" />
              <button type="button" onClick={agregarManual} className="rounded bg-blue-600 px-4 text-sm font-semibold text-white">➕ Agregar</button>
            </div>
            {manuales.length > 0 && (
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-slate-100"><th className="p-1.5 text-left">#</th><th className="p-1.5 text-left">Nombre</th><th className="p-1.5 text-left">Cargo</th><th className="p-1.5">Acción</th></tr></thead>
                <tbody>
                  {manuales.map((d, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-1.5">{i + 1}</td>
                      <td className="p-1.5">{d.titulo} {d.nombre}, {d.postgrado}</td>
                      <td className="p-1.5">{d.cargo}</td>
                      <td className="p-1.5 text-center">
                        <button type="button" onClick={() => setManuales((prev) => prev.filter((_, idx) => idx !== i))} className="rounded bg-red-500 px-2 text-white">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="rounded-lg border border-slate-300 p-4">
        <legend className="px-2 font-semibold text-[#003366]">Firma del convocante</legend>
        <label className="mb-3 block text-sm">Seleccione el convocante
          <select value={convocanteId} onChange={(e) => seleccionarConvocante(e.target.value)} className="ht-input">
            <option value="" disabled>-- Seleccione un docente --</option>
            {opcionesConvocante.map((o) => <option key={o.id} value={o.id}>{o.titulo} {o.nombre}, {o.postgrado} — {o.cargo}</option>)}
          </select>
        </label>
        <p className="mb-3 text-xs text-slate-500">* Seleccione de la lista para autocompletar, o escriba directamente si el convocante no está en la lista.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Título<input required value={convocanteTitulo} onChange={(e) => setConvocanteTitulo(e.target.value)} className="ht-input" /></label>
          <label className="text-sm">Nombre completo<input required value={convocanteNombre} onChange={(e) => setConvocanteNombre(e.target.value)} className="ht-input" /></label>
          <label className="text-sm">Cargo<input required value={convocanteCargo} onChange={(e) => setConvocanteCargo(e.target.value)} className="ht-input" /></label>
          <label className="text-sm">Iniciales elaborador<input required value={inicialesElaborador} onChange={(e) => setInicialesElaborador(e.target.value)} placeholder="Ej: VVP/ddm" className="ht-input" /></label>
        </div>
      </fieldset>

      <button type="submit" disabled={generando} className="ht-btn-primary w-full">
        {generando ? "Generando..." : "📄 Generar Convocatoria Docentes"}
      </button>
    </form>
  );
}

function FormEstudiantes() {
  const [numConvocatoria, setNumConvocatoria] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [ciudad, setCiudad] = useState("Manta");
  const [fecha, setFecha] = useState("");

  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [iaStatus, setIaStatus] = useState<{ texto: string; color: string } | null>(null);

  const [fechaReunion, setFechaReunion] = useState("");
  const [horaReunion, setHoraReunion] = useState("");
  const [lugarReunion, setLugarReunion] = useState("");

  const [grupos, setGrupos] = useState<GrupoLista[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [errorArchivos, setErrorArchivos] = useState("");

  const [convocanteTitulo, setConvocanteTitulo] = useState("");
  const [convocanteNombre, setConvocanteNombre] = useState("");
  const [convocanteCargo, setConvocanteCargo] = useState("");
  const [inicialesElaborador, setInicialesElaborador] = useState("");
  const [generando, setGenerando] = useState(false);

  async function mejorarConIA() {
    if (!asunto && !descripcion) {
      setIaStatus({ texto: "⚠️ Escribe algo primero.", color: "text-red-600" });
      return;
    }
    setIaStatus({ texto: "⏳ Procesando...", color: "text-slate-500" });
    try {
      if (asunto.trim().length >= 3) setAsunto(await enriquecer("convocatoria_asunto", asunto));
      if (descripcion.trim().length >= 3) {
        setDescripcion(await enriquecer("convocatoria_descripcion", descripcion));
      } else if (asunto.trim().length >= 3) {
        setDescripcion(await enriquecer("convocatoria_descripcion_generar", asunto));
      }
      setIaStatus({ texto: "✅ Enriquecido. Puedes editar.", color: "text-green-600" });
    } catch (e) {
      setIaStatus({ texto: `❌ ${(e as Error).message}`, color: "text-red-600" });
    }
  }

  async function analizarArchivos(seleccionados: File[]) {
    if (seleccionados.length === 0) return;
    setAnalizando(true);
    setErrorArchivos("");
    try {
      const fd = new FormData();
      seleccionados.forEach((a) => fd.append("archivos", a));
      const r = await fetch("/utilidades/convocatorias/api/analizar", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudieron leer los archivos");
      const listas = d.listas as ListaAnalizada[];
      const nuevos: GrupoLista[] = listas.map((l, i) => ({
        clave: `${Date.now()}_${i}_${l.archivo}`,
        archivo: l.archivo,
        carrera: CARRERAS[0],
        carreraOtra: "",
        asignatura: l.asignatura,
        paralelo: "",
        advertencias: l.advertencias,
        estudiantes: l.estudiantes,
      }));
      setGrupos((prev) => [...prev, ...nuevos]);
      const periodoDetectado = listas.map((l) => l.periodo).find((p) => PERIODOS.includes(p));
      if (periodoDetectado && !periodo) setPeriodo(periodoDetectado);
    } catch (e) {
      setErrorArchivos((e as Error).message);
    } finally {
      setAnalizando(false);
    }
  }

  function actualizarGrupo(clave: string, cambios: Partial<GrupoLista>) {
    setGrupos((prev) => prev.map((g) => (g.clave === clave ? { ...g, ...cambios } : g)));
  }

  function actualizarNombre(clave: string, indice: number, nombre: string) {
    setGrupos((prev) => prev.map((g) => g.clave === clave
      ? { ...g, estudiantes: g.estudiantes.map((est, i) => (i === indice ? { ...est, nombre } : est)) }
      : g));
  }

  function quitarEstudiante(clave: string, indice: number) {
    setGrupos((prev) => prev.map((g) => g.clave === clave
      ? { ...g, estudiantes: g.estudiantes.filter((_, i) => i !== indice) }
      : g));
  }

  const totalSinNombre = grupos.reduce((suma, g) => suma + g.estudiantes.filter((est) => !est.nombre.trim()).length, 0);

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    if (grupos.length === 0) {
      alert("Suba al menos una lista de estudiantes.");
      return;
    }
    const gruposEnvio = grupos.map((g) => ({
      carrera: g.carrera === CARRERA_OTRA ? g.carreraOtra.trim() : g.carrera,
      asignatura: g.asignatura.trim(),
      paralelo: g.paralelo.trim(),
      estudiantes: g.estudiantes,
    }));
    if (gruposEnvio.some((g) => !g.carrera || !g.asignatura)) {
      alert("Cada lista necesita carrera y asignatura.");
      return;
    }
    if (totalSinNombre > 0 && !confirm(`${totalSinNombre} estudiantes no tienen nombre; se usará su correo en el documento. ¿Generar de todos modos?`)) {
      return;
    }
    setGenerando(true);
    try {
      const fd = new FormData();
      fd.set("num_convocatoria", numConvocatoria);
      fd.set("periodo", periodo);
      fd.set("ciudad", ciudad);
      fd.set("fecha_larga", fecha);
      fd.set("asunto", asunto);
      fd.set("grupos_json", JSON.stringify(gruposEnvio));
      fd.set("descripcion_convocatoria", descripcion);
      fd.set("fecha_reunion", fechaReunion);
      fd.set("hora_reunion", horaReunion);
      fd.set("lugar_reunion", lugarReunion);
      fd.set("convocante_titulo", convocanteTitulo);
      fd.set("convocante_nombre", convocanteNombre);
      fd.set("convocante_cargo", convocanteCargo);
      fd.set("iniciales_elaborador", inicialesElaborador);

      const r = await fetch("/utilidades/convocatorias/api/estudiante", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({ error: "Error desconocido" }))).error);
      descargarBlob(await r.blob(), "Convocatoria_Estudiantes.docx");
    } catch (e) {
      alert(`Error al generar la convocatoria: ${(e as Error).message}`);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <form onSubmit={generar} className="space-y-6">
      <fieldset className="rounded-lg border border-slate-300 p-4">
        <legend className="px-2 font-semibold text-[#003366]">Identificación</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">N.º Convocatoria<input required value={numConvocatoria} onChange={(e) => setNumConvocatoria(e.target.value)} placeholder="Ej: 001" className="ht-input" /></label>
          <label className="text-sm">Periodo académico
            <select required value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="ht-input">
              <option value="" disabled>Seleccione...</option>
              {PERIODOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-sm">Ciudad<input required value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="ht-input" /></label>
          <label className="text-sm">Fecha de emisión<input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="ht-input" /></label>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-300 p-4">
        <legend className="px-2 font-semibold text-[#003366]">Datos del evento</legend>
        <label className="mb-3 block text-sm">Asunto<input required value={asunto} onChange={(e) => setAsunto(e.target.value)} className="ht-input" /></label>
        <label className="block text-sm">Descripción del motivo<textarea required rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="ht-input" /></label>
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-3">
          <button type="button" onClick={mejorarConIA} className="rounded bg-green-600 px-4 py-1.5 text-sm font-semibold text-white">✨ Mejorar con IA</button>
          {iaStatus && <span className={`text-sm ${iaStatus.color}`}>{iaStatus.texto}</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">Fecha de reunión<input required type="date" value={fechaReunion} onChange={(e) => setFechaReunion(e.target.value)} className="ht-input" /></label>
          <label className="text-sm">Hora<input required type="time" value={horaReunion} onChange={(e) => setHoraReunion(e.target.value)} className="ht-input" /></label>
          <label className="col-span-2 text-sm">Lugar<input required value={lugarReunion} onChange={(e) => setLugarReunion(e.target.value)} className="ht-input" /></label>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-300 p-4">
        <legend className="px-2 font-semibold text-[#003366]">Listas de estudiantes (una por asignatura)</legend>
        <input type="file" accept=".xls,.xlsx,.ods,.csv,.txt,.xml,.html,.htm" multiple
          onChange={(e) => { analizarArchivos(Array.from(e.target.files ?? [])); e.target.value = ""; }}
          className="ht-input" />
        <p className="mt-2 text-xs text-slate-500">
          Formatos: Excel, CSV, XML, HTML. La asignatura se toma del nombre del archivo. Puede subir más archivos en cualquier momento.
        </p>
        {analizando && <p className="mt-2 text-sm text-slate-500">⏳ Leyendo archivos...</p>}
        {errorArchivos && <p className="mt-2 text-sm text-red-600">❌ {errorArchivos}</p>}

        <div className="mt-4 space-y-4">
          {grupos.map((g) => {
            const sinNombre = g.estudiantes.filter((est) => !est.nombre.trim()).length;
            return (
              <div key={g.clave} className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="break-all text-xs text-slate-500">📄 {g.archivo}</span>
                  <button type="button" onClick={() => setGrupos((prev) => prev.filter((x) => x.clave !== g.clave))}
                    className="rounded bg-red-500 px-2 text-white">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">Carrera
                    <select value={g.carrera} onChange={(e) => actualizarGrupo(g.clave, { carrera: e.target.value })} className="ht-input">
                      {CARRERAS.map((c) => <option key={c} value={c}>{c}</option>)}
                      <option value={CARRERA_OTRA}>Otra...</option>
                    </select>
                  </label>
                  {g.carrera === CARRERA_OTRA ? (
                    <label className="text-sm">Nombre de la carrera
                      <input required value={g.carreraOtra} onChange={(e) => actualizarGrupo(g.clave, { carreraOtra: e.target.value })} className="ht-input" />
                    </label>
                  ) : <div />}
                  <label className="text-sm">Asignatura
                    <input required value={g.asignatura} onChange={(e) => actualizarGrupo(g.clave, { asignatura: e.target.value })} className="ht-input" />
                  </label>
                  <label className="text-sm">Paralelo (opcional)
                    <input value={g.paralelo} onChange={(e) => actualizarGrupo(g.clave, { paralelo: e.target.value })} className="ht-input" />
                  </label>
                </div>
                {g.advertencias.map((aviso) => <p key={aviso} className="mt-2 text-sm text-amber-700">⚠️ {aviso}</p>)}
                <details className="mt-2" open={sinNombre > 0 && sinNombre < 15}>
                  <summary className="cursor-pointer text-sm font-semibold text-[#003366]">
                    {g.estudiantes.length} estudiantes{sinNombre > 0 ? ` — ${sinNombre} sin nombre` : ""}
                  </summary>
                  <div className="mt-2 max-h-72 overflow-y-auto">
                    {g.estudiantes.map((est, i) => (
                      <div key={`${est.correo}_${i}`} className="mb-1 grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                        <input value={est.nombre} onChange={(ev) => actualizarNombre(g.clave, i, ev.target.value)}
                          placeholder="Apellidos y nombres"
                          className={`ht-input ${est.nombre.trim() ? "" : "border-red-400 bg-red-50"}`} />
                        <span className="truncate text-xs text-slate-500">{est.correo}</span>
                        <button type="button" onClick={() => quitarEstudiante(g.clave, i)} className="rounded bg-red-500 px-2 text-white">✕</button>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-300 p-4">
        <legend className="px-2 font-semibold text-[#003366]">Firma</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Título<input required value={convocanteTitulo} onChange={(e) => setConvocanteTitulo(e.target.value)} placeholder="Ej: Mg." className="ht-input" /></label>
          <label className="text-sm">Nombre completo<input required value={convocanteNombre} onChange={(e) => setConvocanteNombre(e.target.value)} className="ht-input" /></label>
          <label className="text-sm">Cargo<input required value={convocanteCargo} onChange={(e) => setConvocanteCargo(e.target.value)} className="ht-input" /></label>
          <label className="text-sm">Iniciales elaborador<input required value={inicialesElaborador} onChange={(e) => setInicialesElaborador(e.target.value)} placeholder="Ej: VVP/ddm" className="ht-input" /></label>
        </div>
      </fieldset>

      <button type="submit" disabled={generando} className="ht-btn-primary w-full">
        {generando ? "Generando..." : "📄 Generar Convocatoria Estudiantes"}
      </button>
    </form>
  );
}
