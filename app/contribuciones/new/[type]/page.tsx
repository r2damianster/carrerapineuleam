"use client"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

// Tipos de publicación disponibles
const TIPOS_PUBLICACION = [
  'ARTICULO_REGIONAL',
  'ARTICULO_ALTO_IMPACTO',
  'LIBRO',
  'CAPITULO_LIBRO',
  'MEMORIA_EVENTO',
  'PROPIEDAD_INTELECTUAL',
] as const

type TipoPublicacion = typeof TIPOS_PUBLICACION[number]

interface AuthorForm {
  authorName: string
  order: number
  isCarreraAuthor: boolean
}

interface FormValues {
  // campos comunes
  tipoPublicacion: TipoPublicacion
  titulo: string
  lineaInvestigacion: string
  fechaPublicacion: string
  campoDetallado: string
  estado: 'PUBLICADO' | 'ACEPTADO' | 'OTRO'
  // opcionales
  codigoPublicacion?: string
  proyecto?: string
  nombreRevista?: string
  issn?: string
  isbn?: string
  linkPublicacion?: string
  linkRevista?: string
  filiacion?: string
  identificacionParticipante?: string
  categoria?: string
  participacion?: string
  cuartil?: string
  intercultural?: string
  // autores
  authors: AuthorForm[]
}

// Esquema de validación básico (puedes ampliarlo según tipo)
const schema = yup.object().shape({
  tipoPublicacion: yup.string().oneOf(TIPOS_PUBLICACION as any).required(),
  titulo: yup.string().required(),
  lineaInvestigacion: yup.string().required(),
  fechaPublicacion: yup.date().required(),
  campoDetallado: yup.string().required(),
  estado: yup.mixed().oneOf(['PUBLICADO', 'ACEPTADO', 'OTRO']).required(),
  authors: yup
    .array()
    .of(
      yup.object().shape({
        authorName: yup.string().required(),
        order: yup.number().integer().min(1).max(5).required(),
        isCarreraAuthor: yup.boolean().required(),
      })
    )
    .min(1)
    .required(),
})

export default function NewContributionPage({ params }: { params: { type: string } }) {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      tipoPublicacion: params.type as TipoPublicacion,
      authors: [{ authorName: '', order: 1, isCarreraAuthor: true }],
    },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch('/api/contribuciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al registrar')
      }
      router.push('/contribuciones')
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const addAuthor = () => {
    const fields = watch('authors') as AuthorForm[]
    if (fields.length < 5) {
      // @ts-ignore
      control.append('authors', { authorName: '', order: fields.length + 1, isCarreraAuthor: false })
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Nuevo registro de contribución</h1>
      {errorMsg && <div className="bg-red-100 text-red-800 p-2 mb-4">{errorMsg}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tipo de publicación (solo lectura) */}
        <div>
          <label className="block font-medium">Tipo de publicación</label>
          <input
            type="text"
            readOnly
            {...register('tipoPublicacion')}
            className="mt-1 block w-full border rounded p-2 bg-gray-100"
          />
        </div>
        {/* Campos comunes */}
        <div>
          <label className="block font-medium">Título *</label>
          <input type="text" {...register('titulo')} className="mt-1 block w-full border rounded p-2" />
          {errors.titulo && <p className="text-red-600">{errors.titulo.message}</p>}
        </div>
        <div>
          <label className="block font-medium">Línea de investigación *</label>
          <select {...register('lineaInvestigacion')} className="mt-1 block w-full border rounded p-2">
            <option value="">Selecciona</option>
            <option value="Educación y Nuevos Escenarios de la Formación Profesional">Educación y Nuevos Escenarios de la Formación Profesional</option>
            <option value="Cultura Física y Desarrollo Humano">Cultura Física y Desarrollo Humano</option>
            <option value="Economía y Administración para el Desarrollo Sostenible">Economía y Administración para el Desarrollo Sostenible</option>
            <option value="Ciencias Sociales y Bienestar Humano">Ciencias Sociales y Bienestar Humano</option>
            <option value="Biología, Ecología y Conservación de los Recursos Naturales">Biología, Ecología y Conservación de los Recursos Naturales</option>
            <option value="Tecnología de la Información y las Comunicaciones">Tecnología de la Información y las Comunicaciones</option>
            <option value="Ingeniería, Industria, Construcción, Urbanismo y Arquitectura para un Desarrollo Sustentable y Sostenible">Ingeniería, Industria, Construcción, Urbanismo y Arquitectura para un Desarrollo Sustentable y Sostenible</option>
            <option value="Desarrollo e Innovación en el Sector Agropecuario, Agroindustrial, Pesquero Y Acuícola">Desarrollo e Innovación en el Sector Agropecuario, Agroindustrial, Pesquero Y Acuícola</option>
            <option value="Arte, Cultura y Patrimonio">Arte, Cultura y Patrimonio</option>
            <option value="Salud y Calidad de Vida">Salud y Calidad de Vida</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="block font-medium">Fecha de publicación *</label>
          <input type="date" {...register('fechaPublicacion')} className="mt-1 block w-full border rounded p-2" />
        </div>
        <div>
          <label className="block font-medium">Campo detallado *</label>
          <textarea {...register('campoDetallado')} className="mt-1 block w-full border rounded p-2" rows={3} />
        </div>
        <div>
          <label className="block font-medium">Estado *</label>
          <select {...register('estado')} className="mt-1 block w-full border rounded p-2">
            <option value="PUBLICADO">Publicado</option>
            <option value="ACEPTADO">Aceptado</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        {/* Autores */}
        <div>
          <label className="block font-medium mb-2">Autores (máx 5)</label>
          {watch('authors')?.map((author, index) => (
            <div key={index} className="grid grid-cols-4 gap-2 mb-2">
              <input
                type="text"
                placeholder="Nombre"
                {...register(`authors.${index}.authorName` as const)}
                className="col-span-2 border rounded p-1"
              />
              <input
                type="number"
                placeholder="#"
                min={1}
                max={5}
                {...register(`authors.${index}.order` as const)}
                className="border rounded p-1"
              />
              <label className="flex items-center">
                <input type="checkbox" {...register(`authors.${index}.isCarreraAuthor` as const)} className="mr-1" />
                Carrera
              </label>
            </div>
          ))}
          {errors.authors && <p className="text-red-600">{(errors.authors as any).message}</p>}
          {watch('authors')?.length < 5 && (
            <button type="button" onClick={addAuthor} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">
              Añadir autor
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {isSubmitting ? 'Registrando…' : 'Guardar'}
        </button>
      </form>
    </div>
  )
}
