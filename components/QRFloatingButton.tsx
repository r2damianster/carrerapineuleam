'use client';

import { useState } from 'react';
import QRModal from './QRModal';
import { useLanguage } from '@/lib/i18n';

export default function QRFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const q = t.qr;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label={q.floatingButtonAria}
        className="fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-full bg-[#003366] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#FFD700] hover:text-[#003366]"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h4.5v4.5h-4.5v-4.5zm0 9.75h4.5v4.5h-4.5v-4.5zm9.75-9.75h4.5v4.5h-4.5v-4.5zm.75 8.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm2.25-2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm-4.5 2.25h.008v.008h-.008v-.008zm0-4.5h.008v.008h-.008v-.008zm4.5 4.5h.008v.008h-.008v-.008z" />
        </svg>
        <span className="hidden sm:inline">{q.floatingButtonLabel}</span>
      </button>

      {isOpen && <QRModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
