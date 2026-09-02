'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPublications, getNews, getActivities } from '@/lib/db';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    members: 0,
    videos: 0,
    publications: 0,
    news: 0,
    activities: 0,
    categories: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [membersRes, videosRes, categoriesRes, publicationsRes, newsRes, activitiesRes] = await Promise.all([
          fetch('/api/members').then((r) => (r.ok ? r.json() : [])),
          fetch('/api/videos').then((r) => (r.ok ? r.json() : [])),
          fetch('/api/video-categories').then((r) => (r.ok ? r.json() : [])),
          getPublications(),
          getNews(),
          getActivities(),
        ]);

        setStats({
          members: membersRes.length,
          videos: videosRes.length,
          publications: publicationsRes.length,
          news: newsRes.length,
          activities: activitiesRes.length,
          categories: categoriesRes.length,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const statCards = [
    { label: 'Miembros', value: stats.members, icon: '👥', color: 'bg-blue-500', link: '/admin/members' },
    { label: 'Podcast', value: stats.videos, icon: '🎬', color: 'bg-red-500', link: '/admin/videos' },
    { label: 'Categorías', value: stats.categories, icon: '📁', color: 'bg-purple-500', link: '/admin/categories' },
    { label: 'Publicaciones', value: stats.publications, icon: '📄', color: 'bg-green-500', link: '/admin/publications' },
    { label: 'Noticias', value: stats.news, icon: '📰', color: 'bg-yellow-500', link: '/admin/news' },
    { label: 'Actividades', value: stats.activities, icon: '📸', color: 'bg-pink-500', link: '/admin/activities' },
  ];

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-uleam-blue mb-2">Dashboard</h2>
        <p className="text-gray-600">Bienvenido al panel de administración</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.link}
            className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">{stat.icon}</span>
              <div className={`${stat.color} text-white px-3 py-1 rounded-full text-sm font-bold`}>
                {stat.value}
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-800">{stat.label}</h3>
            <p className="text-sm text-gray-500 mt-1">Click para gestionar</p>
          </Link>
        ))}

        {/* Documents Card */}
        <Link
          href="/admin/documents"
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">📑</span>
            <div className="bg-uleam-blue text-white px-3 py-1 rounded-full text-sm font-bold">
              2
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-800">Documentos</h3>
          <p className="text-sm text-gray-500 mt-1">Documentos del proyecto</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="text-xl font-bold text-uleam-blue mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/admin/members/new" className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-center font-medium">
            + Nuevo Miembro
          </Link>
          <Link href="/admin/videos/new" className="px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-center font-medium">
            + Nuevo Podcast
          </Link>
          <Link href="/admin/news/new" className="px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition text-center font-medium">
            + Nueva Noticia
          </Link>
          <Link href="/admin/publications/new" className="px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-center font-medium">
            + Nueva Publicación
          </Link>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-gradient-to-r from-uleam-blue to-primary-700 text-white rounded-xl p-6 shadow-md">
        <h3 className="text-xl font-bold mb-2">ℹ️ Información</h3>
        <p className="text-gray-200 text-sm">
          Migración en curso a base de datos real (Neon). <strong>Miembros, Podcast y Categorías</strong> ya persisten
          de forma permanente. Publicaciones, Noticias y Actividades siguen en el archivo estático <code className="bg-white/20 px-1 rounded">/lib/data.ts</code> —
          los cambios ahí se pierden al reiniciar el servidor, hasta que también se migren.
        </p>
      </div>
    </div>
  );
}
