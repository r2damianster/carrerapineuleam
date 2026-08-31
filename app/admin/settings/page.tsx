'use client';

import { useState, useEffect } from 'react';
import { getSiteSettings, updateSiteSetting } from '@/lib/db';
import type { SiteSettings } from '@/types';

const FIELD_LABELS: Record<string, string> = {
  institution_name: 'Nombre de la Institución',
  contact_email: 'Email de Contacto',
  facebook_url: 'Facebook URL',
  twitter_url: 'Twitter URL',
  instagram_url: 'Instagram URL',
  youtube_url: 'YouTube URL',
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const records = await getSiteSettings();
    setSettings(records);
    setLoading(false);
  };

  const handleChange = (id: string, value: string) => {
    setSettings(settings.map(s => (s.id === id ? { ...s, value } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(settings.map(s => updateSiteSetting(s.id, { value: s.value })));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500">Cargando configuración...</p>;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-uleam-blue mb-2">Configuración del Sitio</h2>
        <p className="text-gray-600">Gestiona la información general del sitio</p>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          Configuración guardada exitosamente
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-md max-w-3xl">
        <div className="space-y-4">
          {settings.map(setting => (
            <div key={setting.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {FIELD_LABELS[setting.key] || setting.key}
              </label>
              <input
                type={setting.key.endsWith('_url') ? 'url' : setting.key === 'contact_email' ? 'email' : 'text'}
                value={setting.value}
                onChange={(e) => handleChange(setting.id, e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
