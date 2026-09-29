"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ContributionForm from '@/components/contribuciones/ContributionForm'

export default function EditarContribucionPage() {
  const params = useParams()
  const id = params.id as string
  const [datos, setDatos] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/contribuciones/${id}`, { headers: { 'Cache-Control': 'no-store' } })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'No se pudo cargar la contribución')
        }
        return res.json()
      })
      .then(data => setDatos(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-4">Cargando…</div>
  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600 mb-2">{error}</p>
        <Link href="/contribuciones" className="text-blue-600 hover:underline">&larr; Volver al listado</Link>
      </div>
    )
  }

  const fechaPublicacion = datos.fechaPublicacion
    ? new Date(datos.fechaPublicacion).toISOString().slice(0, 10)
    : ''

  return (
    <ContributionForm
      tipo={datos.tipoPublicacion}
      mode="edit"
      contributionId={id}
      initialData={{
        ...datos,
        fechaPublicacion,
        categoria: datos.categoria || '',
        authors: datos.authors.map((a: any) => ({
          authorName: a.authorName,
          order: a.order,
          isCarreraAuthor: a.isCarreraAuthor,
          esEstudiante: a.esEstudiante,
        })),
      }}
    />
  )
}
