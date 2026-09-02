import type { SiteSettings, Newsletter, NewsletterItem } from '@/types';
import { siteSettings as initialSiteSettings } from '@/lib/data';

// ============================================================================
// El contenido del sitio (members, publications, video_categories, videos,
// news+activities/actividades_difusion) vive en Neon Postgres desde la
// Sesión 25 — ver CLAUDE.md. Este archivo ya solo gestiona siteSettings (no
// migrado) y getNewsletters (reescrita para leer de Neon vía fetch).
// ============================================================================

let siteSettings = [...initialSiteSettings];

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const now = () => new Date().toISOString();

// ============================================================================
// SITE SETTINGS CRUD
// ============================================================================

export const getSiteSettings = async (): Promise<SiteSettings[]> => {
  return [...siteSettings];
};

export const getSiteSettingByKey = async (key: string): Promise<SiteSettings | undefined> => {
  return siteSettings.find(s => s.key === key);
};

export const createSiteSetting = async (data: Omit<SiteSettings, 'id' | 'created' | 'updated'>): Promise<SiteSettings> => {
  const newSetting: SiteSettings = {
    ...data,
    id: generateId('setting'),
    created: now(),
    updated: now(),
  };
  siteSettings.push(newSetting);
  return newSetting;
};

export const updateSiteSetting = async (id: string, data: Partial<SiteSettings>): Promise<SiteSettings> => {
  const index = siteSettings.findIndex(s => s.id === id);
  if (index === -1) throw new Error('Site setting not found');

  siteSettings[index] = {
    ...siteSettings[index],
    ...data,
    updated: now(),
  };
  return siteSettings[index];
};

export const deleteSiteSetting = async (id: string): Promise<void> => {
  siteSettings = siteSettings.filter(s => s.id !== id);
};

// ============================================================================
// NEWSLETTERS
// ============================================================================

// Trae de actividades_difusion (Neon) — noticias+actividades del sitio ya
// migradas ahí (ver CLAUDE.md Sesión 25), en vez de los arrays estáticos.
export const getNewsletters = async (): Promise<Newsletter[]> => {
  const res = await fetch('/api/actividades-difusion');
  const rows: Array<{ id: number; origen: string; titulo: string; fecha: string; descripcion?: string; photos?: string[] }> = res.ok ? await res.json() : [];

  const allItems: NewsletterItem[] = rows
    .filter(r => r.fecha)
    .map(r => ({
      id: String(r.id),
      type: r.origen === 'noticia' ? 'news' as const : 'activity' as const,
      title: r.titulo,
      date: String(r.fecha).slice(0, 10),
      excerpt: r.descripcion?.substring(0, 150),
      image: r.photos && r.photos.length > 0 ? r.photos[0] : undefined,
    }));

  const grouped = new Map<string, NewsletterItem[]>();
  allItems.forEach(item => {
    const [year, month] = item.date.split('-').map(Number);
    const bimesterIndex = Math.floor((month - 1) / 2);
    const key = `${year}-${bimesterIndex}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  });

  const newsletters: Newsletter[] = Array.from(grouped.entries())
    .map(([key, items]) => {
      const [year, bimesterIndex] = key.split('-').map(Number);
      return {
        id: key,
        year,
        bimesterIndex,
        items: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      };
    })
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.bimesterIndex - a.bimesterIndex;
    });

  return newsletters;
};
