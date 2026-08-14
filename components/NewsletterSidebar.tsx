'use client';

import { Newsletter } from '@/types';
import { useLanguage } from '@/lib/i18n';

interface NewsletterSidebarProps {
  newsletters: Newsletter[];
  activeNewsletterId: string;
  onSelectNewsletter: (id: string) => void;
}

export default function NewsletterSidebar({
  newsletters,
  activeNewsletterId,
  onSelectNewsletter,
}: NewsletterSidebarProps) {
  const { t } = useLanguage();

  const getBimesterLabel = (bimesterIndex: number): string => {
    return t.boletines.bimesterLabels[bimesterIndex] || '';
  };

  const sortedNewsletters = [...newsletters].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.bimesterIndex - a.bimesterIndex;
  });

  return (
    <aside className="w-full md:w-64 md:pr-6 mb-8 md:mb-0">
      <div className="sticky top-32 md:top-24">
        <h2 className="text-lg font-bold text-uleam-blue mb-4">{t.boletines.newsletters}</h2>
        <nav className="space-y-2">
          {sortedNewsletters.map(newsletter => (
            <button
              key={newsletter.id}
              onClick={() => onSelectNewsletter(newsletter.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                activeNewsletterId === newsletter.id
                  ? 'bg-uleam-blue text-white shadow-md'
                  : 'bg-gray-100 text-uleam-blue hover:bg-gray-200'
              }`}
            >
              <div className="font-semibold">
                {getBimesterLabel(newsletter.bimesterIndex)}
              </div>
              <div className={`text-sm ${activeNewsletterId === newsletter.id ? 'text-gray-100' : 'text-gray-600'}`}>
                {newsletter.year}
              </div>
              <div className={`text-xs mt-1 ${activeNewsletterId === newsletter.id ? 'text-gray-200' : 'text-gray-500'}`}>
                {newsletter.items.length} {newsletter.items.length === 1 ? 'item' : 'items'}
              </div>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
