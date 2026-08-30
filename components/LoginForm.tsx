'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

export default function LoginForm() {
  const { t } = useLanguage();
  const f = t.loginForm;
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/vinculacion/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 401) {
        setError(f.invalidCredentialsError);
        return;
      }
      if (!res.ok) {
        setError(f.genericError);
        return;
      }
      router.push('/vinculacion/dinamicas-linguisticas/asistencia');
      router.refresh();
    } catch {
      setError(f.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto bg-gray-50 rounded-lg p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-uleam-blue text-center">{f.pageTitle}</h1>

      <div>
        <label className="block font-semibold text-uleam-blue mb-2">{f.emailLabel}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-uleam-blue focus:ring-2 focus:ring-uleam-blue/20 outline-none transition"
        />
      </div>

      <div>
        <label className="block font-semibold text-uleam-blue mb-2">{f.passwordLabel}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-uleam-blue focus:ring-2 focus:ring-uleam-blue/20 outline-none transition"
        />
      </div>

      {error && <p className="text-red-600 text-center font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition-all disabled:opacity-50"
      >
        {submitting ? f.submittingButton : f.submitButton}
      </button>
    </form>
  );
}
