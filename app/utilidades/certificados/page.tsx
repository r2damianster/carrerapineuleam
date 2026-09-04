'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Packer } from 'docx';
import CertificateTemplate from '@/components/CertificateTemplate';
import { buildCertificateDocument } from '@/lib/certificateDocx';
import type {
  CertificateData,
  CertificateEntity,
  CertificateLogo,
  CertificateSigner,
  CertificateType,
} from '@/types';

interface Docente {
  id: number;
  titulo_grado: string;
  nombre: string;
  post_grado: string;
  cargo: string;
  carrera: string;
}

const TYPE_OPTIONS: { value: CertificateType; label: string }[] = [
  { value: 'participacion', label: 'Participación en jornada/evento' },
  { value: 'expositor', label: 'Participación como expositor(a)' },
  { value: 'capacitador', label: 'Capacitador(a) / facilitador(a)' },
  { value: 'asistencia', label: 'Asistencia (sin ponencia)' },
  { value: 'voluntariado', label: 'Voluntariado' },
  { value: 'reconocimiento', label: 'Reconocimiento' },
];

const ENTITY_OPTIONS: { value: CertificateEntity; label: string }[] = [
  { value: 'proyecto', label: 'Proyecto de Innovaciones Pedagógicas e Internacionalización' },
  { value: 'grupo_investigacion', label: 'Grupo de Investigación' },
  { value: 'carrera', label: 'Carrera de Pedagogía de los Idiomas (PINE)' },
];

const LOGO_OPTIONS: { value: CertificateLogo; label: string }[] = [
  { value: 'proyecto', label: 'Logo del Proyecto PINE' },
  { value: 'grupo_investigacion', label: 'Logo del Grupo de Investigación' },
  { value: 'red_lea', label: 'Logo Red LEA' },
  { value: 'ninguno', label: 'Sin logo adicional (solo ULEAM)' },
];

const todayISO = () => new Date().toISOString().split('T')[0];

const formatDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const emptySigner = (): CertificateSigner => ({ name: '', role: '' });

const sanitizeFileName = (name: string) => name.trim().replace(/\s+/g, '-').replace(/[^\w\-]/g, '') || 'participante';

// Cada línea es "Nombre" o "Nombre | Motivo específico" — si no trae motivo,
// usa el motivo/ponencia general del formulario.
function parseRecipients(text: string): { name: string; motive?: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...resto] = line.split('|');
      const motive = resto.join('|').trim();
      return { name: name.trim(), motive: motive || undefined };
    });
}

async function mejorarConIA(texto: string): Promise<string> {
  const r = await fetch('/utilidades/api/ia-enriquecer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contexto: 'certificado_motivo', texto }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Error de IA');
  return d.texto_enriquecido;
}

export default function CertificadosPage() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [miId, setMiId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/utilidades/api/docentes')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDocentes(Array.isArray(d) ? d : []))
      .catch(() => setDocentes([]));
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMiId(d?.usuario?.id ?? null))
      .catch(() => setMiId(null));
  }, []);

  const [data, setData] = useState<CertificateData>({
    type: 'participacion',
    entity: 'proyecto',
    secondaryLogo: 'proyecto',
    recipientName: '',
    motiveText: '',
    eventName: '',
    date: todayISO(),
    place: 'Manta',
    signers: [emptySigner(), emptySigner()],
  });
  const [recipientsText, setRecipientsText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [iaProcesando, setIaProcesando] = useState(false);
  const [iaMensaje, setIaMensaje] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  const update = <K extends keyof CertificateData>(key: K, value: CertificateData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const updateSigner = (index: number, field: keyof CertificateSigner, value: string) => {
    setData((prev) => ({
      ...prev,
      signers: prev.signers.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const seleccionarFirmante = (index: number, docenteId: string) => {
    const d = docentes.find((x) => String(x.id) === docenteId);
    if (!d) return;
    const nombreCompuesto = `${d.titulo_grado} ${d.nombre}${d.post_grado ? `, ${d.post_grado}` : ''}`.trim();
    setData((prev) => ({
      ...prev,
      signers: prev.signers.map((s, i) => (i === index ? { name: nombreCompuesto, role: d.cargo } : s)),
    }));
  };

  // Autoselecciona al usuario logueado como primer firmante, si está en la lista de docentes (sigue editable).
  useEffect(() => {
    if (!miId || !docentes.some((d) => String(d.id) === miId)) return;
    if (!data.signers[0]?.name) seleccionarFirmante(0, miId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miId, docentes]);

  const addSigner = () => {
    if (data.signers.length >= 3) return;
    setData((prev) => ({ ...prev, signers: [...prev.signers, emptySigner()] }));
  };

  const removeSigner = (index: number) => {
    if (data.signers.length <= 2) return;
    setData((prev) => ({ ...prev, signers: prev.signers.filter((_, i) => i !== index) }));
  };

  const handleMejorarMotivo = async () => {
    if (data.motiveText.trim().length < 3) {
      setIaMensaje('⚠️ Escribe algo primero en el motivo/ponencia.');
      return;
    }
    setIaProcesando(true);
    setIaMensaje('');
    try {
      update('motiveText', await mejorarConIA(data.motiveText));
      setIaMensaje('✅ Texto mejorado. Puedes editarlo.');
    } catch (e: any) {
      setIaMensaje(`❌ ${e.message}`);
    } finally {
      setIaProcesando(false);
    }
  };

  const recipients = parseRecipients(recipientsText);

  const handleDownload = async () => {
    const lista = recipients.length > 0 ? recipients : [{ name: data.recipientName.trim(), motive: undefined }];
    if (!lista[0].name) {
      alert('Ingresa al menos el nombre de un destinatario');
      return;
    }

    setExporting(true);
    try {
      if (lista.length === 1) {
        const exportData: CertificateData = { ...data, date: formatDate(data.date), motiveText: lista[0].motive || data.motiveText };
        const doc = await buildCertificateDocument(exportData, lista[0].name);
        const blob = await Packer.toBlob(doc);
        downloadBlob(blob, `Certificado-${sanitizeFileName(lista[0].name)}.docx`);
      } else {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        for (const r of lista) {
          const exportData: CertificateData = { ...data, date: formatDate(data.date), motiveText: r.motive || data.motiveText };
          const doc = await buildCertificateDocument(exportData, r.name);
          const blob = await Packer.toBlob(doc);
          zip.file(`Certificado-${sanitizeFileName(r.name)}.docx`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, 'Certificados.zip');
      }
    } catch (error) {
      console.error('Error generando certificado:', error);
      alert('Error al generar el certificado');
    } finally {
      setExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const primero = recipients[0];
  const previewName = primero?.name || data.recipientName;
  const previewData: CertificateData = {
    ...data,
    recipientName: previewName,
    motiveText: primero?.motive || data.motiveText,
    date: formatDate(data.date),
  };

  const requiereMotivo = data.type === 'participacion' || data.type === 'expositor' || data.type === 'capacitador' || data.type === 'reconocimiento';

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex gap-4">
        <Link href="/utilidades" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver a Utilidades
        </Link>
        <Link href="/portal/dashboard" className="inline-flex items-center text-[#003366] hover:underline font-medium">
          &larr; Volver al Portal PINE
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-uleam-blue">🏆 Generador de Certificados</h1>
        <p className="text-gray-600 text-sm mt-1">
          Completa los datos y descarga el certificado en Word (.docx), listo para imprimir, firmar o enviar por correo.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Formulario */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de certificado</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={data.type}
                onChange={(e) => update('type', e.target.value as CertificateType)}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Otorgado por</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={data.entity}
                onChange={(e) => update('entity', e.target.value as CertificateEntity)}
              >
                {ENTITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo adicional (junto al de ULEAM)</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={data.secondaryLogo}
              onChange={(e) => update('secondaryLogo', e.target.value as CertificateLogo)}
            >
              {LOGO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destinatario(s)
              <span className="font-normal text-gray-400"> — uno por línea; agrega <code>| motivo</code> al final de una línea para darle un motivo/ponencia distinto solo a esa persona</span>
            </label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              placeholder={'Nombre completo del participante\nOtro nombre | Su propio título de ponencia\n...'}
            />
            {recipients.length > 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Se generarán {recipients.length} certificados y se descargarán juntos en un .zip
                {recipients.some((r) => r.motive) && ' — algunos con motivo individual'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del evento</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={data.eventName}
              onChange={(e) => update('eventName', e.target.value)}
              placeholder='Ej. "Jornadas de Investigación, Innovaciones y Desarrollo 2026"'
            />
          </div>

          {requiereMotivo && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {data.type === 'reconocimiento' ? 'Motivo del reconocimiento' : data.type === 'capacitador' ? 'Tema de la capacitación' : 'Título de la ponencia'}
                <span className="font-normal text-gray-400"> — motivo general (cada destinatario puede tener el suyo, ver arriba)</span>
              </label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={2}
                value={data.motiveText}
                onChange={(e) => update('motiveText', e.target.value)}
                placeholder={
                  data.type === 'reconocimiento'
                    ? 'Ej. su destacada trayectoria y aporte a la investigación educativa'
                    : 'Ej. Actividad física como estrategia para estimular...'
                }
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleMejorarMotivo}
                  disabled={iaProcesando}
                  className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {iaProcesando ? 'Procesando...' : '✨ Mejorar con IA'}
                </button>
                {iaMensaje && <span className="text-xs text-gray-600">{iaMensaje}</span>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={data.place}
                onChange={(e) => update('place', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={data.date}
                onChange={(e) => update('date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Firmantes (2 a 3)</label>
              {data.signers.length < 3 && (
                <button
                  type="button"
                  onClick={addSigner}
                  className="text-sm text-uleam-blue hover:underline"
                >
                  + Agregar firmante
                </button>
              )}
            </div>
            <div className="space-y-3">
              {data.signers.map((signer, i) => (
                <div key={i} className="border rounded-md p-2 space-y-2">
                  <select
                    defaultValue=""
                    onChange={(e) => { seleccionarFirmante(i, e.target.value); e.target.value = ''; }}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  >
                    <option value="" disabled>-- Seleccionar de la lista de docentes --</option>
                    {docentes.map((d) => (
                      <option key={d.id} value={d.id}>{d.titulo_grado} {d.nombre}, {d.post_grado} — {d.cargo}</option>
                    ))}
                  </select>
                  <div className="flex gap-2 items-start">
                    <input
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="Nombre y título (ej. Lic. Verónica Chávez, Mg.)"
                      value={signer.name}
                      onChange={(e) => updateSigner(i, 'name', e.target.value)}
                    />
                    <input
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="Cargo (ej. Directora de Carrera PINE)"
                      value={signer.role}
                      onChange={(e) => updateSigner(i, 'role', e.target.value)}
                    />
                    {data.signers.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeSigner(i)}
                        className="text-red-500 hover:text-red-700 px-2"
                        title="Quitar firmante"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={exporting}
            className="w-full bg-uleam-blue text-white rounded px-4 py-3 font-semibold hover:bg-uleam-blue/90 disabled:opacity-50"
          >
            {exporting
              ? 'Generando...'
              : recipients.length > 1
                ? `Descargar ${recipients.length} certificados (.zip)`
                : 'Descargar certificado (Word)'}
          </button>
        </div>

        {/* Vista previa */}
        <div className="bg-gray-100 rounded-lg shadow p-6 overflow-auto">
          <p className="text-sm text-gray-500 mb-3">
            Vista previa{recipients.length > 1 ? ` (1.º de ${recipients.length} destinatarios)` : ''}:
          </p>
          <div className="origin-top-left" style={{ transform: 'scale(0.55)', width: 550, height: 'auto' }}>
            <div ref={previewRef}>
              <CertificateTemplate data={previewData} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
