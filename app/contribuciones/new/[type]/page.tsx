"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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

// Esquema de validación básico (puedes ampliarlo según tipo)
const schema = yup.object({
  tipoPublicacion: yup.string().oneOf(TIPOS_PUBLICACION).required(),
  titulo: yup.string().required(),
  lineaInvestigacion: yup.string().required(),
  fechaPublicacion: yup.string().required(),
  campoDetallado: yup.string().required(),
  estado: yup.string().oneOf(['PUBLICADO', 'ACEPTADO', 'OTRO'] as const).required(),
  authors: yup
    .array()
    .of(
      yup.object({
        authorName: yup.string().required(),
        order: yup.number().integer().min(1).max(5).required(),
        isCarreraAuthor: yup.boolean().required(),
        esEstudiante: yup.boolean().required(),
      })
    )
    .min(1)
    .required(),
})

type FormValues = yup.InferType<typeof schema>

export default function NewContributionPage({ params }: { params: { type: string } }) {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      tipoPublicacion: params.type as TipoPublicacion,
      authors: [{ authorName: '', order: 1, isCarreraAuthor: true, esEstudiante: false }],
    },
  })

  const { fields: authorFields, append: appendAuthor, replace: replaceAuthors } = useFieldArray({ control, name: 'authors' })

  const [doiInput, setDoiInput] = useState('')
  const [autocompletando, setAutocompletando] = useState<'doi' | 'pdf' | null>(null)
  const [autocompletarError, setAutocompletarError] = useState<string | null>(null)

  const aplicarDatosExtraidos = (datos: {
    titulo?: string
    fechaPublicacion?: string
    campoDetallado?: string
    estado?: 'PUBLICADO' | 'ACEPTADO' | 'OTRO'
    authors?: { authorName: string; order: number; isCarreraAuthor: boolean; esEstudiante?: boolean }[]
  }) => {
    if (datos.titulo) setValue('titulo', datos.titulo)
    if (datos.fechaPublicacion) setValue('fechaPublicacion', datos.fechaPublicacion)
    if (datos.campoDetallado) setValue('campoDetallado', datos.campoDetallado)
    if (datos.estado) setValue('estado', datos.estado)
    if (datos.authors && datos.authors.length > 0) {
      replaceAuthors(datos.authors.map(a => ({ ...a, esEstudiante: a.esEstudiante ?? false })))
    }
  }

  const buscarPorDoi = async () => {
    if (!doiInput.trim()) return
    setAutocompletando('doi')
    setAutocompletarError(null)
    try {
      const res = await fetch('/api/contribuciones/extract-doi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: doiInput }),
      })
      const datos = await res.json()
      if (!res.ok) throw new Error(datos.error || 'No se pudo buscar el DOI')
      aplicarDatosExtraidos(datos)
    } catch (e: any) {
      setAutocompletarError(e.message)
    } finally {
      setAutocompletando(null)
    }
  }

  const extraerDePdf = async (archivo: File) => {
    setAutocompletando('pdf')
    setAutocompletarError(null)
    try {
      const form = new FormData()
      form.append('archivo', archivo)
      const res = await fetch('/api/contribuciones/extract-pdf', { method: 'POST', body: form })
      const datos = await res.json()
      if (!res.ok) throw new Error(datos.error || 'No se pudo leer el PDF')
      aplicarDatosExtraidos(datos)
    } catch (e: any) {
      setAutocompletarError(e.message)
    } finally {
      setAutocompletando(null)
    }
  }

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
      router.push('/portal/dashboard?contribucion=registrada')
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const addAuthor = () => {
    if (authorFields.length < 5) {
      appendAuthor({ authorName: '', order: authorFields.length + 1, isCarreraAuthor: true, esEstudiante: false })
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Nuevo registro de contribución</h1>

      <div className="bg-gray-50 border rounded p-4 mb-6 space-y-3">
        <h2 className="font-medium text-gray-800">Autocompletar (opcional)</h2>
        <p className="text-sm text-gray-500">
          Busca por DOI o sube el PDF del artículo — la IA precarga los campos. Todos los autores quedan
          marcados como "Carrera" por defecto (desmarca los que sean externos), y puedes indicar cuáles
          son estudiantes. Revisa todo antes de guardar.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="DOI o URL (ej: 10.1234/abcd.5678)"
            value={doiInput}
            onChange={e => setDoiInput(e.target.value)}
            className="flex-1 border rounded p-2"
          />
          <button
            type="button"
            onClick={buscarPorDoi}
            disabled={autocompletando !== null || !doiInput.trim()}
            className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50 whitespace-nowrap"
          >
            {autocompletando === 'doi' ? 'Buscando…' : 'Buscar por DOI'}
          </button>
        </div>
        <div>
          <label className="text-sm text-gray-600">o sube el PDF del artículo:</label>
          <input
            type="file"
            accept="application/pdf"
            disabled={autocompletando !== null}
            onChange={e => {
              const archivo = e.target.files?.[0]
              if (archivo) extraerDePdf(archivo)
              e.target.value = ''
            }}
            className="block mt-1 text-sm"
          />
          {autocompletando === 'pdf' && <p className="text-sm text-gray-500 mt-1">Leyendo PDF…</p>}
        </div>
        {autocompletarError && <p className="text-red-600 text-sm">{autocompletarError}</p>}
      </div>

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
          {authorFields.map((author, index) => {
            const esDeCarrera = watch(`authors.${index}.isCarreraAuthor`)
            return (
              <div key={author.id} className="grid grid-cols-5 gap-2 mb-2">
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
                  {...register(`authors.${index}.order` as const, { valueAsNumber: true })}
                  className="border rounded p-1"
                />
                <label className="flex items-center">
                  <input type="checkbox" {...register(`authors.${index}.isCarreraAuthor` as const)} className="mr-1" />
                  Carrera
                </label>
                <label className={`flex items-center ${esDeCarrera ? '' : 'text-gray-300'}`}>
                  <input
                    type="checkbox"
                    disabled={!esDeCarrera}
                    {...register(`authors.${index}.esEstudiante` as const)}
                    className="mr-1"
                  />
                  Estudiante
                </label>
              </div>
            )
          })}
          {errors.authors && <p className="text-red-600">{(errors.authors as any).message}</p>}
          {authorFields.length < 5 && (
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
