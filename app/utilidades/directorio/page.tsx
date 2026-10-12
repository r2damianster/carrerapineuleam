"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { etiquetaPersona } from "../_lib/formatoPersona";

interface ContactoExterno {
  id: number;
  titulo_grado: string;
  nombre: string;
  post_grado: string;
  cargo: string;
  carrera: string;
  eliminable: boolean;
}

const FORMULARIO_VACIO = { titulo_grado: "", nombres: "", apellidos: "", post_grado: "", cargo: "", dependencia: "" };

export default function DirectorioPage() {
  const [contactos, setContactos] = useState<ContactoExterno[]>([]);
  const [dependencias, setDependencias] = useState<string[]>([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; esError: boolean } | null>(null);

  const cargar = useCallback(async () => {
    const [respuestaContactos, respuestaDependencias] = await Promise.all([
      fetch("/utilidades/directorio/api"),
      fetch("/utilidades/oficios/api/carreras"),
    ]);
    const datosContactos = respuestaContactos.ok ? await respuestaContactos.json() : [];
    const datosDependencias = respuestaDependencias.ok ? await respuestaDependencias.json() : [];
    setContactos(Array.isArray(datosContactos) ? datosContactos : []);
    setDependencias(Array.isArray(datosDependencias) ? datosDependencias : []);
  }, []);

  useEffect(() => {
    cargar().catch(() => setMensaje({ texto: "No se pudo cargar el directorio", esError: true }));
  }, [cargar]);

  function actualizarCampo(campo: keyof typeof FORMULARIO_VACIO, valor: string) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch("/utilidades/directorio/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formulario),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo guardar");
      setFormulario(FORMULARIO_VACIO);
      setMensaje({ texto: "Contacto agregado. Ya aparece en Oficios (destinatario, firmante y CC).", esError: false });
      await cargar();
    } catch (error) {
      setMensaje({ texto: (error as Error).message, esError: true });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(contacto: ContactoExterno) {
    if (!window.confirm(`¿Eliminar a ${contacto.nombre} del directorio?`)) return;
    setMensaje(null);
    const respuesta = await fetch(`/utilidades/directorio/api?id=${contacto.id}`, { method: "DELETE" });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setMensaje({ texto: datos.error || "No se pudo eliminar", esError: true });
      return;
    }
    await cargar();
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex gap-4">
        <Link href="/utilidades" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver a Utilidades
        </Link>
        <Link href="/utilidades/oficios" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver a Oficios
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-[#003366]">📇 Directorio de contactos externos</h1>
      <p className="mb-6 text-sm text-slate-600">
        Personas de otras dependencias o instituciones que no tienen cuenta en el Portal. Una vez agregadas,
        se pueden elegir como destinatario, firmante o «Con copia a» en el generador de Oficios.
      </p>

      <form onSubmit={guardar} className="mb-8 space-y-3 rounded-lg border border-slate-300 p-4">
        <h2 className="font-semibold text-[#003366]">Agregar contacto</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Título (opcional)
            <input value={formulario.titulo_grado} onChange={(e) => actualizarCampo("titulo_grado", e.target.value)}
              placeholder="Ej: Lic., Dr., Ing." className="ht-input" />
          </label>
          <label className="block text-sm">
            Posgrado (opcional)
            <input value={formulario.post_grado} onChange={(e) => actualizarCampo("post_grado", e.target.value)}
              placeholder="Ej: Mg., PhD." className="ht-input" />
          </label>
          <label className="block text-sm">
            Nombres
            <input required value={formulario.nombres} onChange={(e) => actualizarCampo("nombres", e.target.value)} className="ht-input" />
          </label>
          <label className="block text-sm">
            Apellidos
            <input required value={formulario.apellidos} onChange={(e) => actualizarCampo("apellidos", e.target.value)} className="ht-input" />
          </label>
          <label className="block text-sm">
            Cargo
            <input required value={formulario.cargo} onChange={(e) => actualizarCampo("cargo", e.target.value)}
              placeholder="Ej: Directora de Bienestar" className="ht-input" />
          </label>
          <label className="block text-sm">
            Dependencia / institución
            <input required list="dependencias-existentes" value={formulario.dependencia}
              onChange={(e) => actualizarCampo("dependencia", e.target.value)} className="ht-input" />
            <datalist id="dependencias-existentes">
              {dependencias.map((dependencia) => <option key={dependencia} value={dependencia} />)}
            </datalist>
          </label>
        </div>
        <button type="submit" disabled={guardando}
          className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {guardando ? "Guardando..." : "Agregar al directorio"}
        </button>
        {mensaje && (
          <p className={`text-sm ${mensaje.esError ? "text-red-600" : "text-green-700"}`}>{mensaje.texto}</p>
        )}
      </form>

      <h2 className="mb-2 font-semibold text-[#003366]">Contactos externos ({contactos.length})</h2>
      {contactos.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay contactos externos.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-300">
          {contactos.map((contacto) => (
            <li key={contacto.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>
                <span className="font-medium">{etiquetaPersona(contacto)}</span>
                <span className="block text-xs text-slate-500">{contacto.carrera}</span>
              </span>
              {contacto.eliminable ? (
                <button type="button" onClick={() => eliminar(contacto)} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                  Eliminar
                </button>
              ) : (
                <span className="text-xs text-slate-400">protegido</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
