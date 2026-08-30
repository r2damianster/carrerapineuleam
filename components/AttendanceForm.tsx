'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Estudiante, Espacio, Beneficiario } from '@/lib/neon';
import { EstudianteSession } from '@/lib/session';
import { useLanguage } from '@/lib/i18n';

export default function AttendanceForm({ estudianteSesion }: { estudianteSesion: EstudianteSession }) {
  const { t } = useLanguage();
  const f = t.attendanceForm;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);

  const [espacioId, setEspacioId] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [estudiantesPresentes, setEstudiantesPresentes] = useState<string[]>([estudianteSesion.id]);
  const [beneficiariosPresentes, setBeneficiariosPresentes] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState('');

  const [showNewBeneficiario, setShowNewBeneficiario] = useState(false);
  const [newBeneficiarioNombre, setNewBeneficiarioNombre] = useState('');
  const [newBeneficiarioContacto, setNewBeneficiarioContacto] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'noStudents'>('idle');

  async function loadData() {
    setLoading(true);
    setConnectionError(false);
    try {
      const res = await fetch(`/api/vinculacion/roster?modalidad=${estudianteSesion.modalidad ?? 'club_ingles'}`);
      if (!res.ok) throw new Error(`roster fetch failed: ${res.status}`);
      const data = await res.json();
      setEstudiantes(data.estudiantes);
      setEspacios(data.espacios);
      setBeneficiarios(data.beneficiarios);
    } catch (err) {
      console.error('Neon connection error:', err);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleLogout() {
    await fetch('/api/vinculacion/auth/logout', { method: 'POST' });
    router.push('/vinculacion/dinamicas-linguisticas/login');
    router.refresh();
  }

  function toggleEstudiante(id: string) {
    setEstudiantesPresentes((prev) =>
      prev.includes(id) ? prev.filter((existingId) => existingId !== id) : [...prev, id]
    );
  }

  function toggleBeneficiario(id: string) {
    setBeneficiariosPresentes((prev) =>
      prev.includes(id) ? prev.filter((existingId) => existingId !== id) : [...prev, id]
    );
  }

  async function handleAddBeneficiario() {
    if (!newBeneficiarioNombre.trim()) return;
    const res = await fetch('/api/vinculacion/beneficiarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: newBeneficiarioNombre.trim(),
        contacto: newBeneficiarioContacto.trim(),
      }),
    });
    const created: Beneficiario = await res.json();
    setBeneficiarios((prev) => [...prev, created]);
    setBeneficiariosPresentes((prev) => [...prev, created.id]);
    setNewBeneficiarioNombre('');
    setNewBeneficiarioContacto('');
    setShowNewBeneficiario(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (estudiantesPresentes.length === 0) {
      setSubmitStatus('noStudents');
      return;
    }
    setSubmitting(true);
    setSubmitStatus('idle');
    try {
      const res = await fetch('/api/vinculacion/bitacora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiantes_presentes: estudiantesPresentes,
          espacio_id: espacioId,
          fecha,
          beneficiarios_presentes: beneficiariosPresentes,
          observaciones,
        }),
      });
      if (!res.ok) throw new Error(`bitacora submit failed: ${res.status}`);
      setSubmitStatus('success');
      setEstudiantesPresentes([]);
      setBeneficiariosPresentes([]);
      setObservaciones('');
    } catch (err) {
      console.error('bitacora submit error:', err);
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-center text-gray-500 py-12">{f.loadingMessage}</p>;
  }

  if (connectionError) {
    return <p className="text-center text-red-600 py-12">{f.connectionErrorMessage}</p>;
  }

  return (
    <>
    <div className="max-w-2xl mx-auto flex items-center justify-between mb-4 text-sm text-gray-600">
      <span>{f.sessionLabel}: <strong className="text-uleam-blue">{estudianteSesion.nombre}</strong></span>
      <button type="button" onClick={handleLogout} className="text-uleam-blue hover:underline font-semibold">
        {f.logoutButton}
      </button>
    </div>
    <h1 className="text-3xl md:text-4xl font-bold text-uleam-blue text-center mb-10">{f.pageTitle}</h1>
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-gray-50 rounded-lg p-6 md:p-8 space-y-6">
      <div>
        <label className="block font-semibold text-uleam-blue mb-2">{f.spaceLabel}</label>
        <select
          value={espacioId}
          onChange={(e) => setEspacioId(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-uleam-blue focus:ring-2 focus:ring-uleam-blue/20 outline-none transition"
        >
          <option value="">{f.spacePlaceholder}</option>
          {espacios.map((espacio) => (
            <option key={espacio.id} value={espacio.id}>
              {espacio.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-semibold text-uleam-blue mb-2">{f.dateLabel}</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-uleam-blue focus:ring-2 focus:ring-uleam-blue/20 outline-none transition"
        />
      </div>

      <div>
        <label className="block font-semibold text-uleam-blue mb-2">{f.studentsLabel}</label>
        <div className="space-y-2">
          {estudiantes.map((estudiante) => (
            <label key={estudiante.id} className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 cursor-pointer hover:shadow-sm">
              <input
                type="checkbox"
                checked={estudiantesPresentes.includes(estudiante.id)}
                onChange={() => toggleEstudiante(estudiante.id)}
                className="w-5 h-5 accent-uleam-blue"
              />
              <span className="text-gray-700">{estudiante.nombre}</span>
            </label>
          ))}
        </div>
        {submitStatus === 'noStudents' && (
          <p className="text-red-600 text-sm mt-2">{f.noStudentsError}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-semibold text-uleam-blue">{f.beneficiariesLabel}</label>
          <button
            type="button"
            onClick={() => setShowNewBeneficiario((prev) => !prev)}
            className="text-sm font-semibold text-uleam-blue hover:underline"
          >
            {f.addBeneficiaryButton}
          </button>
        </div>

        {showNewBeneficiario && (
          <div className="bg-white rounded-lg p-4 mb-3 space-y-3">
            <input
              type="text"
              value={newBeneficiarioNombre}
              onChange={(e) => setNewBeneficiarioNombre(e.target.value)}
              placeholder={f.newBeneficiaryNamePlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue"
            />
            <input
              type="text"
              value={newBeneficiarioContacto}
              onChange={(e) => setNewBeneficiarioContacto(e.target.value)}
              placeholder={f.newBeneficiaryContactPlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddBeneficiario}
                className="px-4 py-2 bg-uleam-blue text-white rounded-lg font-semibold text-sm"
              >
                {f.newBeneficiarySaveButton}
              </button>
              <button
                type="button"
                onClick={() => setShowNewBeneficiario(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm"
              >
                {f.newBeneficiaryCancelButton}
              </button>
            </div>
          </div>
        )}

        {beneficiarios.length === 0 && !showNewBeneficiario && (
          <p className="text-gray-500 text-sm">{f.noBeneficiariesWarning}</p>
        )}

        <div className="space-y-2">
          {beneficiarios.map((beneficiario) => (
            <label key={beneficiario.id} className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 cursor-pointer hover:shadow-sm">
              <input
                type="checkbox"
                checked={beneficiariosPresentes.includes(beneficiario.id)}
                onChange={() => toggleBeneficiario(beneficiario.id)}
                className="w-5 h-5 accent-uleam-blue"
              />
              <span className="text-gray-700">{beneficiario.nombre}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-semibold text-uleam-blue mb-2">{f.notesLabel}</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder={f.notesPlaceholder}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-uleam-blue focus:ring-2 focus:ring-uleam-blue/20 outline-none transition resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition-all disabled:opacity-50"
      >
        {submitting ? f.submittingButton : f.submitButton}
      </button>

      {submitStatus === 'success' && (
        <p className="text-green-600 text-center font-semibold">{f.successMessage}</p>
      )}
      {submitStatus === 'error' && (
        <p className="text-red-600 text-center font-semibold">{f.errorMessage}</p>
      )}
    </form>
    </>
  );
}
