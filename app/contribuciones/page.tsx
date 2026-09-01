"use client";
import { Fragment, useEffect, useState } from "react";

interface Author {
  authorName: string;
  order: number;
  isCarreraAuthor: boolean;
  esEstudiante: boolean;
}

interface Contribution {
  id: string;
  tipoPublicacion: string;
  titulo: string;
  lineaInvestigacion: string;
  fechaSubida: string;
  authors: Author[];
  [key: string]: any; // resto de campos específicos por tipo
}

// Campos específicos a mostrar en el detalle, por tipo de publicación.
// [clave, etiqueta]
const CAMPOS_POR_TIPO: Record<string, [string, string][]> = {
  ARTICULO_REGIONAL: [
    ["tipoArticulo", "Tipo de artículo"], ["codigoPublicacion", "Código de publicación"], ["proyecto", "Proyecto"],
    ["baseDatosIndexada", "Base de datos indexada"], ["nombreRevista", "Revista"], ["issn", "ISSN"],
    ["cuartil", "Cuartil"], ["categoria", "Categoría docente"], ["participacion", "Participación"],
    ["linkPublicacion", "Link publicación"], ["linkRevista", "Link revista"], ["filiacion", "Filiación"],
    ["identificacionParticipante", "Identificación participante"],
  ],
  ARTICULO_ALTO_IMPACTO: [
    ["tipoArticulo", "Tipo de artículo"], ["codigoPublicacion", "Código de publicación"], ["proyecto", "Proyecto"],
    ["baseDatosIndexada", "Base de datos indexada"], ["nombreRevista", "Revista"], ["issn", "ISSN"],
    ["cuartil", "Cuartil"], ["categoria", "Categoría docente"], ["participacion", "Participación"],
    ["linkPublicacion", "Link publicación"], ["linkRevista", "Link revista"], ["filiacion", "Filiación"],
    ["identificacionParticipante", "Identificación participante"],
  ],
  LIBRO: [
    ["tituloLibro", "Título del libro"], ["codigoPublicacion", "Código de publicación"], ["proyecto", "Proyecto"],
    ["isbn", "ISBN"], ["revisadoPares", "Revisado por pares"], ["filiacion", "Filiación"],
    ["identificacionParticipante", "Identificación participante"], ["participacion", "Participación"],
  ],
  CAPITULO_LIBRO: [
    ["tituloLibro", "Título del libro"], ["tituloCapitulo", "Título del capítulo"], ["codigoPublicacion", "Código de publicación"],
    ["proyecto", "Proyecto"], ["isbn", "ISBN"], ["editorCompilador", "Editor/compilador"], ["paginas", "Páginas"],
    ["totalCapituloLibro", "Total de capítulos"], ["filiacion", "Filiación"],
    ["identificacionParticipante", "Identificación participante"], ["participacion", "Participación"],
  ],
  MEMORIA_EVENTO: [
    ["tipoArticulo", "Tipo de artículo"], ["codigoPublicacion", "Código de publicación"], ["nombrePonencia", "Ponencia"],
    ["nombreEvento", "Evento"], ["edicionEvento", "Edición"], ["organizadorEvento", "Organizador"],
    ["comiteOrganizador", "Comité organizador"], ["pais", "País"], ["ciudad", "Ciudad"],
    ["identificacionParticipante", "Identificación participante"], ["participacion", "Participación"],
  ],
  PROPIEDAD_INTELECTUAL: [
    ["certificadoN", "N° certificado"], ["solicitudN", "N° solicitud"], ["claseDeObra", "Clase de obra"],
    ["tituloObra", "Título de la obra"], ["lugar", "Lugar"],
  ],
};

function formatearValor(valor: any): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  return String(valor);
}

export default function ContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  const fetchContributions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contribuciones", {
        headers: { "Cache-Control": "no-store" },
      });
      if (!res.ok) throw new Error("Failed to fetch contributions");
      const data = await res.json();
      setContributions(data);
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta contribución?")) return;
    const res = await fetch(`/api/contribuciones?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setContributions(prev => prev.filter(c => c.id !== id));
    } else {
      alert("Error al eliminar");
    }
  };

  if (loading) return <div className="p-4">Cargando…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Contribuciones (solo admin)</h1>
      {contributions.length === 0 ? (
        <p>No hay contribuciones registradas.</p>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border"></th>
              <th className="p-2 border">Tipo</th>
              <th className="p-2 border">Título</th>
              <th className="p-2 border">Periodo</th>
              <th className="p-2 border">Línea de investigación</th>
              <th className="p-2 border">Fecha subida</th>
              <th className="p-2 border">Autores</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map(c => {
              const abierto = expandido === c.id;
              const camposDetalle = CAMPOS_POR_TIPO[c.tipoPublicacion] || [];
              return (
                <Fragment key={c.id}>
                  <tr>
                    <td className="p-2 border text-center">
                      <button
                        className="text-gray-500 hover:text-gray-800"
                        onClick={() => setExpandido(abierto ? null : c.id)}
                        title="Ver detalle"
                      >
                        {abierto ? "▾" : "▸"}
                      </button>
                    </td>
                    <td className="p-2 border">{c.tipoPublicacion}</td>
                    <td className="p-2 border">{c.titulo}</td>
                    <td className="p-2 border">{c.periodoAcademico}</td>
                    <td className="p-2 border">{c.lineaInvestigacion}</td>
                    <td className="p-2 border">{new Date(c.fechaSubida).toLocaleString()}</td>
                    <td className="p-2 border">
                      {c.authors.map(a => (
                        <div key={a.order}># {a.order}: {a.authorName}
                          {a.isCarreraAuthor ? (a.esEstudiante ? " (carrera, estudiante)" : " (carrera)") : ""}
                        </div>
                      ))}
                    </td>
                    <td className="p-2 border">
                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded"
                        onClick={() => handleDelete(c.id)}
                      >Eliminar</button>
                    </td>
                  </tr>
                  {abierto && (
                    <tr>
                      <td></td>
                      <td colSpan={7} className="p-3 border bg-gray-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          <div><span className="font-medium">Campo detallado:</span> {formatearValor(c.campoDetallado)}</div>
                          <div><span className="font-medium">Estado:</span> {formatearValor(c.estado)}</div>
                          <div><span className="font-medium">Fecha publicación:</span> {c.fechaPublicacion ? new Date(c.fechaPublicacion).toLocaleDateString() : "—"}</div>
                          <div><span className="font-medium">Intercultural:</span> {formatearValor(c.intercultural)}</div>
                          {camposDetalle.map(([clave, etiqueta]) => (
                            <div key={clave}><span className="font-medium">{etiqueta}:</span> {formatearValor(c[clave])}</div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
