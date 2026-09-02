"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ParticipanteForm {
  titulo: string;
  nombre: string;
  cargo: string;
}

interface Docente {
  id: number;
  titulo_grado: string;
  nombre: string;
  post_grado: string;
  cargo: string;
  carrera: string;
}

const MAX_PARTICIPANTES = 9;

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

export default function ActaTecnicaPage() {
  const [docentes, setDocentes] = useState<Docente[]>([]);

  useEffect(() => {
    fetch("/utilidades/api/docentes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDocentes(Array.isArray(data) ? data : []))
      .catch(() => setDocentes([]));
  }, []);

  const [numActa, setNumActa] = useState("");
  const [fechaReunion, setFechaReunion] = useState("");
  const [lugarReunion, setLugarReunion] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [convocante, setConvocante] = useState("");

  const [participantes, setParticipantes] = useState<ParticipanteForm[]>([
    { titulo: "", nombre: "", cargo: "Docente" },
  ]);

  const [elaboradoTitulo, setElaboradoTitulo] = useState("");
  const [elaboradoNombre, setElaboradoNombre] = useState("");

  const [notasAspectos, setNotasAspectos] = useState("");
  const [notasReunion, setNotasReunion] = useState("");
  const [notasCompromisos, setNotasCompromisos] = useState("");
  const [iaStatus, setIaStatus] = useState<{ texto: string; color: string } | null>(null);

  const [fotos, setFotos] = useState<File[]>([]);
  const [generando, setGenerando] = useState(false);

  function actualizarParticipante(idx: number, campo: keyof ParticipanteForm, valor: string) {
    setParticipantes((prev) => prev.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)));
  }

  function agregarParticipante() {
    if (participantes.length >= MAX_PARTICIPANTES) return;
    setParticipantes((prev) => [...prev, { titulo: "", nombre: "", cargo: "Docente" }]);
  }

  function seleccionarConvocante(id: string) {
    const d = docentes.find((x) => String(x.id) === id);
    if (!d) return;
    setConvocante(`${d.titulo_grado} ${d.nombre}, ${d.cargo}`.trim());
  }

  function seleccionarParticipante(idx: number, id: string) {
    const d = docentes.find((x) => String(x.id) === id);
    if (!d) return;
    setParticipantes((prev) =>
      prev.map((p, i) => (i === idx ? { titulo: d.titulo_grado, nombre: d.nombre, cargo: d.cargo } : p))
    );
  }

  function seleccionarElaborador(id: string) {
    const d = docentes.find((x) => String(x.id) === id);
    if (!d) return;
    setElaboradoTitulo(d.titulo_grado);
    setElaboradoNombre(d.nombre);
  }

  async function mejorarConIA() {
    if (!notasAspectos && !notasReunion && !notasCompromisos) {
      setIaStatus({ texto: "⚠️ Escribe algo en al menos un campo.", color: "text-red-600" });
      return;
    }
    setIaStatus({ texto: "⏳ Procesando...", color: "text-slate-500" });
    try {
      if (notasAspectos.trim().length >= 3) setNotasAspectos(await enriquecer("acta_aspectos", notasAspectos));
      if (notasReunion.trim().length >= 3) setNotasReunion(await enriquecer("acta_desarrollo", notasReunion));
      if (notasCompromisos.trim().length >= 3) setNotasCompromisos(await enriquecer("acta_compromisos", notasCompromisos));
      setIaStatus({ texto: "✅ Texto enriquecido. Puedes editarlo.", color: "text-green-600" });
    } catch (e) {
      setIaStatus({ texto: `❌ ${(e as Error).message}`, color: "text-red-600" });
    }
  }

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setGenerando(true);
    try {
      const fd = new FormData();
      fd.set("num_acta", numActa);
      fd.set("fecha_reunion", fechaReunion);
      fd.set("lugar_reunion", lugarReunion);
      fd.set("hora_inicio", horaInicio);
      fd.set("hora_fin", horaFin);
      fd.set("convocante", convocante);
      participantes.forEach((p) => {
        if (!p.nombre) return;
        fd.append("p_titulo[]", p.titulo);
        fd.append("p_nombre[]", p.nombre);
        fd.append("p_cargo[]", p.cargo);
      });
      fd.set("elaborado_titulo", elaboradoTitulo);
      fd.set("elaborado_nombre", elaboradoNombre);
      fd.set("notas_aspectos", notasAspectos);
      fd.set("notas_reunion", notasReunion);
      fd.set("notas_compromisos", notasCompromisos);
      fotos.forEach((f) => fd.append("fotos_evidencia", f));

      const r = await fetch("/utilidades/acta-tecnica/api", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({ error: "Error desconocido" }))).error);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Acta_${(numActa || "000").replace(/\//g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Error al generar el acta: ${(e as Error).message}`);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex gap-4">
        <Link href="/utilidades" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver a Utilidades
        </Link>
        <Link href="/portal/dashboard" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver al Portal PINE
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-[#003366]">📝 Acta Técnica con IA</h1>
      <form onSubmit={generar} className="space-y-6">
        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">1. Información general</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">N.º Acta<input required value={numActa} onChange={(e) => setNumActa(e.target.value)} placeholder="Ej: DCPLL-004-2026" className="ht-input" /></label>
            <label className="text-sm">Fecha<input required type="date" value={fechaReunion} onChange={(e) => setFechaReunion(e.target.value)} className="ht-input" /></label>
            <label className="text-sm">Lugar<input required value={lugarReunion} onChange={(e) => setLugarReunion(e.target.value)} placeholder="Ej: Aula 102" className="ht-input" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">Hora inicio<input required type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="ht-input" /></label>
              <label className="text-sm">Hora fin<input required type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="ht-input" /></label>
            </div>
            <label className="col-span-2 text-sm">Convocado por (Nombre, Cargo)
              <select defaultValue="" onChange={(e) => { seleccionarConvocante(e.target.value); e.target.value = ""; }} className="ht-input mb-2">
                <option value="" disabled>-- Seleccionar de la lista de docentes --</option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>{d.titulo_grado} {d.nombre}, {d.post_grado} — {d.cargo}</option>
                ))}
              </select>
              <input required value={convocante} onChange={(e) => setConvocante(e.target.value)} placeholder="Ej: Mg. López, Director de Carrera" className="ht-input" />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">2. Participantes (aparecerán como firmantes)</legend>
          <p className="mb-2 text-xs text-slate-500">Máximo 9 participantes (el acta tiene 10 espacios de firma: 1 para el convocante + 9 participantes). Seleccione un docente de la lista para autocompletar sus datos, o escríbalos manualmente (invitados externos).</p>
          {participantes.map((p, i) => (
            <div key={i} className="mb-3 rounded-md border border-slate-200 p-2">
              <select defaultValue="" onChange={(e) => { seleccionarParticipante(i, e.target.value); e.target.value = ""; }} className="ht-input mb-2">
                <option value="" disabled>-- Seleccionar de la lista de docentes --</option>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>{d.titulo_grado} {d.nombre}, {d.post_grado} — {d.cargo}</option>
                ))}
              </select>
              <div className="grid grid-cols-[80px_2fr_1fr] gap-2">
                <input value={p.titulo} onChange={(e) => actualizarParticipante(i, "titulo", e.target.value)} placeholder="Título" className="ht-input" />
                <input required value={p.nombre} onChange={(e) => actualizarParticipante(i, "nombre", e.target.value)} placeholder="Nombre y apellidos" className="ht-input" />
                <input value={p.cargo} onChange={(e) => actualizarParticipante(i, "cargo", e.target.value)} placeholder="Cargo" className="ht-input" />
              </div>
            </div>
          ))}
          <button type="button" onClick={agregarParticipante} disabled={participantes.length >= MAX_PARTICIPANTES}
            className="mt-2 rounded bg-slate-200 px-4 py-1.5 text-sm font-semibold disabled:opacity-50">
            + Añadir participante
          </button>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">3. Elaborado por</legend>
          <select defaultValue="" onChange={(e) => { seleccionarElaborador(e.target.value); e.target.value = ""; }} className="ht-input mb-3">
            <option value="" disabled>-- Seleccionar de la lista de docentes --</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>{d.titulo_grado} {d.nombre}, {d.post_grado} — {d.cargo}</option>
            ))}
          </select>
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <label className="text-sm">Título<input required value={elaboradoTitulo} onChange={(e) => setElaboradoTitulo(e.target.value)} placeholder="Ej: Lic." className="ht-input" /></label>
            <label className="text-sm">Nombre completo<input required value={elaboradoNombre} onChange={(e) => setElaboradoNombre(e.target.value)} className="ht-input" /></label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">4. Notas para el acta</legend>
          <div className="flex flex-col gap-3">
            <label className="text-sm">Puntos del orden del día<textarea required rows={3} value={notasAspectos} onChange={(e) => setNotasAspectos(e.target.value)} className="ht-input" /></label>
            <label className="text-sm">¿Qué sucedió en la reunión? (resumen breve)<textarea required rows={4} value={notasReunion} onChange={(e) => setNotasReunion(e.target.value)} className="ht-input" /></label>
            <label className="text-sm">Acuerdos y compromisos finales<textarea required rows={3} value={notasCompromisos} onChange={(e) => setNotasCompromisos(e.target.value)} className="ht-input" /></label>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 p-3">
            <button type="button" onClick={mejorarConIA} className="rounded bg-green-600 px-4 py-1.5 text-sm font-semibold text-white">✨ Mejorar notas con IA</button>
            {iaStatus && <span className={`text-sm ${iaStatus.color}`}>{iaStatus.texto}</span>}
          </div>
          <p className="mt-2 text-xs text-slate-500">La redacción final del acta siempre pasa por IA al generarse, aunque no uses este botón.</p>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-300 p-4">
          <legend className="px-2 font-semibold text-[#003366]">5. Evidencias fotográficas (opcional)</legend>
          <input type="file" accept="image/*" multiple onChange={(e) => setFotos(Array.from(e.target.files ?? []))} className="ht-input" />
          {fotos.length > 0 && <p className="mt-2 text-xs text-slate-500">{fotos.length} foto(s) seleccionada(s)</p>}
        </fieldset>

        <button type="submit" disabled={generando} className="ht-btn-primary w-full">
          {generando ? "Generando..." : "🤖 Generar Acta con IA"}
        </button>
      </form>
    </main>
  );
}
