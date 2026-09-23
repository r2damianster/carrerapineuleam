'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface UserSessionState {
  id: string;
  nombres: string;
  email: string;
  rol: string;
  impersonatedBy?: {
    id: string;
    email: string;
    nombres: string;
  };
}

export default function ImpersonationBanner() {
  const pathname = usePathname();
  const [session, setSession] = useState<UserSessionState | null>(null);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.usuario?.impersonatedBy) {
          setSession(data.usuario);
        } else {
          setSession(null);
        }
      })
      .catch(() => setSession(null));
  }, [pathname]);

  if (!session || !session.impersonatedBy) return null;

  const handleRevert = async () => {
    setReverting(true);
    try {
      const res = await fetch('/api/superadmin/impersonate/revert', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.redirect) {
        window.location.href = data.redirect;
      } else {
        alert(data.error || 'Error al restaurar sesión');
        setReverting(false);
      }
    } catch {
      alert('Error de conexión al restaurar sesión');
      setReverting(false);
    }
  };

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex flex-wrap items-center justify-between shadow-lg sticky top-0 z-[99999] border-b border-amber-700">
      <div className="flex items-center gap-2">
        <span className="text-base animate-pulse">👁️</span>
        <span>
          <strong>Modo "Ver como" activo:</strong> Identificado como{' '}
          <span className="underline font-semibold">{session.nombres}</span> ({session.rol}) —{' '}
          <span className="opacity-90">Superadmin: {session.impersonatedBy.nombres}</span>
        </span>
      </div>

      <button
        onClick={handleRevert}
        disabled={reverting}
        className="bg-white text-amber-900 hover:bg-amber-100 font-bold px-3 py-1 rounded shadow-sm transition-colors text-xs disabled:opacity-50"
      >
        {reverting ? 'Restaurando...' : '↩ Volver a Superadmin'}
      </button>
    </div>
  );
}

