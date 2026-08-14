'use client';

import { useLanguage } from '@/lib/i18n';

type FilterType = 'all' | 'news' | 'activity';

interface NewsletterFilterProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export default function NewsletterFilter({
  activeFilter,
  onFilterChange,
}: NewsletterFilterProps) {
  const { t } = useLanguage();

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: t.boletines.filterAll || 'Todos' },
    { value: 'news', label: t.boletines.newsBadge || 'Noticias' },
    { value: 'activity', label: t.boletines.activityBadge || 'Actividades' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === filter.value
              ? 'bg-uleam-blue text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
