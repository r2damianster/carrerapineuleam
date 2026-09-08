"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Docente {
  id: number;
  titulo_grado: string;
  nombre: string;
  post_grado: string;
  cargo: string;
}

export default function PatMaestriaPage() {
  const [maestriaOpcion, setMaestriaOpcion] = useState("1");
  const [nombreMaestrante, setNombreMaestrante] = useState("");
  const [tituloArticulo, setTituloArticulo] = useState("");
  const [metodologiaOpcion, setMetodologiaOpcion] = useState("1");
  const [numOficio, setNumOficio] = useState("");
  const [horaInicio, setHoraInicio] = useState("16:00");
  const [fechaSesion, setFechaSesion] = useState("");
  const [fechaDesignacion, setFechaDesignacion] = useState("");
  const [generando, setGenerando] = useState(false);

  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [tutorId, setTutorId] = useState("");
  const [tutorNombre, setTutorNombre] = useState("");
  const [miId, setMiId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/utilidades/api/docentes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDocentes(Array.isArray(data) ? data : []))
      .catch(() => setDocentes([]));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMiId(data?.usuario?.id ?? null))
      .catch(() => setMiId(null));
  }, []);

  // Autoselecciona al usuario logueado como tutor (sigue pudiendo cambiarse:
  // un docente puede generar los PAT en nombre de otro tutor).
  useEffect(() => {
    if (!miId || tutorId) return;
    if (docentes.some((d) => String(d.id) === miId)) seleccionarTutor(miId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miId, docentes]);

  function seleccionarTutor(id: string) {
    setTutorId(id);
    const d = docentes.find((x) => String(x.id) === id);
    if (!d) return;
    setTutorNombre(`${d.titulo_grado} ${d.nombre}${d.post_grado ? `, ${d.post_grado}` : ""}`.trim());
  }

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setGenerando(true);
    try {
      const fd = new FormData();
      fd.set("maestria_opcion", maestriaOpcion);
      fd.set("nombre_maestrante", nombreMaestrante);
      fd.set("titulo_articulo", tituloArticulo);
      fd.set("metodologia_opcion", metodologiaOpcion);
      fd.set("num_oficio", numOficio);
      fd.set("hora_inicio", horaInicio);
      fd.set("fecha_sesion", fechaSesion);
      fd.set("fecha_designacion", fechaDesignacion);
      fd.set("tutor_nombre", tutorNombre);

      const r = await fetch("/utilidades/pat-maestria/api", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({ error: "Error desconocido" }))).error);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PATS_${(nombreMaestrante || "maestrante").replace(/\s+/g, "_").slice(0, 15)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Error al generar el paquete PAT: ${(e as Error).message}`);
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
      <h1 className="mb-6 text-2xl font-bold text-[#003366]">📦 Documentos PAT de Maestría</h1>
      <form onSubmit={generar} className="space-y-6">
        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">Programa y Maestrante</legend>
          <label className="mb-3 block text-sm">
            Maestría
            <select required value={maestriaOpcion} onChange={(e) => setMaestriaOpcion(e.target.value)} className="ht-input">
              <option value="1">Lingüística y Literatura</option>
              <option value="2">Innovaciones Pedagógicas</option>
              <option value="3">Pedagogía de Idiomas (Inglés)</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Nombre del maestrante
              <input required value={nombreMaestrante} onChange={(e) => setNombreMaestrante(e.target.value)}
                placeholder="Nombres y apellidos completos" className="ht-input" />
            </label>
            <label className="text-sm">Título del trabajo/artículo
              <input required value={tituloArticulo} onChange={(e) => setTituloArticulo(e.target.value)} className="ht-input" />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">Metodología</legend>
          <label className="block text-sm">
            Tipo de investigación (define los temas de sesión)
            <select required value={metodologiaOpcion} onChange={(e) => setMetodologiaOpcion(e.target.value)} className="ht-input">
              <option value="1">Revisión Sistemática</option>
              <option value="2">No Experimental</option>
              <option value="3">Cuasi-Experimental</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">Logística y fechas</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">N.º Oficio recibido<input required value={numOficio} onChange={(e) => setNumOficio(e.target.value)} className="ht-input" /></label>
            <label className="text-sm">Hora de inicio de sesión<input required type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="ht-input" /></label>
            <label className="text-sm">Fecha sesión 9 (última)<input required type="date" value={fechaSesion} onChange={(e) => setFechaSesion(e.target.value)} className="ht-input" /></label>
            <label className="text-sm">Fecha designación del tutor<input required type="date" value={fechaDesignacion} onChange={(e) => setFechaDesignacion(e.target.value)} className="ht-input" /></label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">Tutor/a</legend>
          <label className="mb-3 block text-sm">
            Seleccione el/la tutor/a
            <select value={tutorId} onChange={(e) => seleccionarTutor(e.target.value)} className="ht-input">
              <option value="" disabled>-- Seleccione un tutor/a --</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>{d.titulo_grado} {d.nombre}, {d.post_grado} — {d.cargo}</option>
              ))}
            </select>
          </label>
          <p className="mb-3 text-xs text-slate-500">* Por defecto aparece quien inició sesión. Cámbielo si está generando los PAT para otro/a tutor/a, o escriba directamente si no está en la lista.</p>
          <label className="block text-sm">Nombre completo del tutor/a
            <input required value={tutorNombre} onChange={(e) => setTutorNombre(e.target.value)} className="ht-input" />
          </label>
        </fieldset>

        <button type="submit" disabled={generando} className="ht-btn-primary w-full">
          {generando ? "Generando..." : "📦 Generar Paquete PAT (.zip)"}
        </button>
      </form>
    </main>
  );
}
