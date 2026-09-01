"use client";
import { useEffect, useState } from "react";

interface Author {
  authorName: string;
  order: number;
  isCarreraAuthor: boolean;
}

interface Contribution {
  id: string;
  tipoPublicacion: string;
  titulo: string;
  lineaInvestigacion: string;
  fechaSubida: string;
  authors: Author[];
}

export default function ContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              <th className="p-2 border">Tipo</th>
              <th className="p-2 border">Título</th>
              <th className="p-2 border">Línea de investigación</th>
              <th className="p-2 border">Fecha subida</th>
              <th className="p-2 border">Autores</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map(c => (
              <tr key={c.id}>
                <td className="p-2 border">{c.tipoPublicacion}</td>
                <td className="p-2 border">{c.titulo}</td>
                <td className="p-2 border">{c.lineaInvestigacion}</td>
                <td className="p-2 border">{new Date(c.fechaSubida).toLocaleString()}</td>
                <td className="p-2 border">
                  {c.authors.map(a => (
                    <div key={a.order}># {a.order}: {a.authorName}{a.isCarreraAuthor ? " (carrera)" : ""}</div>
                  ))}
                </td>
                <td className="p-2 border">
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded"
                    onClick={() => handleDelete(c.id)}
                  >Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
