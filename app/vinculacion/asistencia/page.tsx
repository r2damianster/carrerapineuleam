'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const FOTO_MAX_DIMENSION = 1600;
const FOTO_CALIDAD = 0.7;

// Comprime en el navegador antes de subir a Cloudinary — una foto de celular
// puede pesar 5-8MB; reducida a ~1600px + JPEG 0.7 queda normalmente bajo
// 500KB sin pérdida visible relevante para evidencia de sesión. Evita que el
// banco de fotos de asistencia (potencialmente 1 por sesión x n espacios)
// infle el plan gratuito de Cloudinary.
// Comprime en el navegador antes de subir a Cloudinary — una foto de celular
// puede pesar 5-8MB; reducida a ~1600px + JPEG 0.7 queda normalmente bajo
// 500KB sin pérdida visible relevante para evidencia de sesión. Si el navegador
// no puede comprimir el archivo (ej. HEIC de iPhone o sin soporte en canvas),
// se hace fallback seguro devolviendo el archivo original para que el servidor lo procese.
function comprimirImagen(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > FOTO_MAX_DIMENSION) {
          height = Math.round(height * (FOTO_MAX_DIMENSION / width));
          width = FOTO_MAX_DIMENSION;
        } else if (height > FOTO_MAX_DIMENSION) {
          width = Math.round(width * (FOTO_MAX_DIMENSION / height));
          height = FOTO_MAX_DIMENSION;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', FOTO_CALIDAD);
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function AsistenciaPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [espacios, setEspacios] = useState<any[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [presentes, setPresentes] = useState<number[]>([]);
  const [instructoresTitulares, setInstructoresTitulares] = useState<any[]>([]);
  const [presentesInstructores, setPresentesInstructores] = useState<number[]>([]);
  const [pasantesTodos, setPasantesTodos] = useState<any[]>([]);
  const [invitadoSeleccion, setInvitadoSeleccion] = useState('');
  const [invitados, setInvitados] = useState<number[]>([]);
  
  // Fecha actual en Ecuador (UTC-5)
  const hoyEcuador = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(() => hoyEcuador);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Ventana de 48h (Ecuador): no se puede elegir un día futuro ni uno de más de 2 días atrás
  const fechaMaxima = hoyEcuador;
  const fechaMinima = new Date(Date.now() - 5 * 60 * 60 * 1000 - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin', 'estudiante'].includes(data.usuario.rol)) {
          router.push('/');
          return;
        }
        setCheckingSession(false);
        fetch('/api/estudiantes-lista').then(r => r.json()).then(d => {
          if (d.estudiantes) setPasantesTodos(d.estudiantes);
        });
        return fetch('/api/espacios?area=vinculacion').then(r => r.json()).then(d => {
          if (d.success) {
            setEspacios(d.data);
            if (d.data.length === 1) setEspacioId(String(d.data[0].id));
          }
        });
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/asistencia'));
  }, [router]);

  useEffect(() => {
    if (!espacioId) {
      setBeneficiarios([]);
      setInstructoresTitulares([]);
      setInvitados([]);
      return;
    }
    fetch(`/api/beneficiarios?espacio_id=${espacioId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setBeneficiarios(d.data);
          setPresentes(d.data.map((b: any) => b.id));
        }
      });
    fetch(`/api/espacios/instructores?espacio_id=${espacioId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setInstructoresTitulares(d.data);
          setPresentesInstructores(d.data.map((i: any) => i.id));
        }
      });
    setInvitados([]);
    setInvitadoSeleccion('');
  }, [espacioId]);

  const pasantesInvitables = pasantesTodos.filter(
    (p) => !instructoresTitulares.some((i) => i.id === p.id) && !invitados.includes(p.id)
  );

  const agregarInvitado = () => {
    if (!invitadoSeleccion) return;
    setInvitados([...invitados, parseInt(invitadoSeleccion)]);
    setInvitadoSeleccion('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!espacioId) {
      setMessage('Error: Selecciona un espacio');
      return;
    }
    if (presentes.length === 0) {
      setMessage('Error: Selecciona al menos un beneficiario presente');
      return;
    }
    if (!horaInicio || !horaFin) {
      setMessage('Error: Ingresa hora de inicio y de fin');
      return;
    }
    if (horaFin <= horaInicio) {
      setMessage('Error: La hora de fin debe ser posterior a la de inicio');
      return;
    }
    if (!foto) {
      setMessage('Error: Sube una foto de evidencia de la sesión');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      setSubiendoFoto(true);
      const fotoComprimida = await comprimirImagen(foto);
      const formData = new FormData();
      formData.append('file', fotoComprimida);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      setSubiendoFoto(false);
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Error subiendo la foto');
      const fotoUrl = uploadData.url;
      const fotoPublicId = uploadData.public_id;

      const res = await fetch('/api/espacios/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          espacio_id: parseInt(espacioId),
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          beneficiarios_presentes: presentes,
          instructores_presentes: presentesInstructores,
          invitados_presentes: invitados,
          observaciones,
          foto_url: fotoUrl,
          foto_public_id: fotoPublicId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Asistencia registrada exitosamente — queda pendiente de aprobación del profesor.');
      setPresentes([]);
      setPresentesInstructores(instructoresTitulares.map((i: any) => i.id));
      setInvitados([]);
      setObservaciones('');
      setHoraInicio('');
      setHoraFin('');
      setFoto(null);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setSubiendoFoto(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h2 className="text-3xl font-bold text-center text-uleam-blue mb-8">Registrar Asistencia</h2>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Espacio</label>
            <select required value={espacioId} onChange={e => setEspacioId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue">
              <option value="">Selecciona tu espacio...</option>
              {espacios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
            <input
              type="date"
              required
              value={fecha}
              min={fechaMinima}
              max={fechaMaxima}
              onChange={e => setFecha(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue"
            />
            <p className="text-xs text-gray-400 mt-1">Solo puedes registrar asistencia hasta 48 horas después del día del club.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hora de inicio</label>
              <input type="time" required value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hora de fin</label>
              <input type="time" required value={horaFin} onChange={e => setHoraFin(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-4">La duración real (hora de fin − hora de inicio) es la que se acredita como horas al aprobarse.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto de evidencia de la sesión</label>
            <input type="file" accept="image/*,.heic,.heif" required onChange={e => setFoto(e.target.files?.[0] || null)} className="w-full text-sm text-gray-600" />
            <p className="text-xs text-gray-400 mt-1">Obligatoria. Se comprime automáticamente antes de subirse, no hace falta reducirla tú.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiarios presentes</label>
            <div className="border border-gray-300 rounded-lg p-4 h-56 overflow-y-auto space-y-1">
              {beneficiarios.length === 0 && <p className="text-gray-400 text-sm">{espacioId ? 'Sin beneficiarios inscritos en este espacio.' : 'Selecciona un espacio primero.'}</p>}
              {beneficiarios.map(b => (
                <label key={b.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={presentes.includes(b.id)} onChange={(e) => {
                    if (e.target.checked) setPresentes([...presentes, b.id]);
                    else setPresentes(presentes.filter(id => id !== b.id));
                  }} className="w-5 h-5 accent-uleam-blue" />
                  <span className="text-gray-700">{b.nombres} {b.apellidos}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pasante que Asistió a la Sesión</label>
            <div className="border border-gray-300 rounded-lg p-4 space-y-1">
              {instructoresTitulares.length === 0 && <p className="text-gray-400 text-sm">{espacioId ? 'Sin pasantes asignados a este espacio.' : 'Selecciona un espacio primero.'}</p>}
              {instructoresTitulares.map(i => (
                <label key={i.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={presentesInstructores.includes(i.id)} onChange={(e) => {
                    if (e.target.checked) setPresentesInstructores([...presentesInstructores, i.id]);
                    else setPresentesInstructores(presentesInstructores.filter(id => id !== i.id));
                  }} className="w-5 h-5 accent-uleam-blue" />
                  <span className="text-gray-700">{i.nombres} {i.apellidos}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Solo quien queda marcado como presente acredita horas al aprobarse el registro.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pasante invitado (apoyo de otro espacio, opcional)</label>
            <div className="flex gap-2 mb-2">
              <select value={invitadoSeleccion} onChange={e => setInvitadoSeleccion(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue">
                <option value="">Selecciona un pasante...</option>
                {pasantesInvitables.map((p: any) => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </select>
              <button type="button" onClick={agregarInvitado} disabled={!invitadoSeleccion} className="px-4 py-2 bg-uleam-blue/10 text-uleam-blue font-semibold rounded-lg hover:bg-uleam-blue/20 disabled:opacity-50">
                + Agregar
              </button>
            </div>
            {invitados.length > 0 && (
              <div className="border border-gray-300 rounded-lg p-4 space-y-1">
                {invitados.map(id => {
                  const p = pasantesTodos.find((x: any) => x.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50">
                      <span className="text-gray-700">{p ? `${p.nombres} ${p.apellidos}` : id}</span>
                      <button type="button" onClick={() => setInvitados(invitados.filter(x => x !== id))} className="text-red-600 text-sm hover:underline">Quitar</button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">Sus horas se acreditan igual que a un instructor titular, tras la aprobación del profesor.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones (opcional)</label>
            <textarea rows={3} value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue resize-none" />
          </div>

          <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition disabled:opacity-50">
            {subiendoFoto ? 'Subiendo foto...' : loading ? 'Guardando...' : 'Guardar Asistencia'}
          </button>
        </form>
      </div>
    </div>
  );
}
