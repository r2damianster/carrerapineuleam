'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/admin/DataTable';
import type { Member } from '@/types';

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    orcid: '',
    email: '',
    is_leader: false,
    order: 0,
    projects: [] as string[],
  });

  const PROJECT_OPTIONS = [
    { value: 'internacionalizacion', label: 'Innovaciones Pedagógicas e Internacionalización' },
    { value: 'vinculacion', label: 'Dinámicas Lingüísticas en Contextos Locales (Vinculación)' },
    { value: 'desarrollo_habilidades', label: 'Desarrollo de Habilidades Lingüísticas' },
    { value: 'mentoring', label: 'Mentoring' },
  ];

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (!res.ok) throw new Error('Failed to fetch members');
      const records = await res.json();
      setMembers(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', role: '', orcid: '', email: '', is_leader: false, order: 0, projects: [] });
    setEditingMember(null);
    setShowForm(false);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      orcid: member.orcid || '',
      email: member.email,
      is_leader: member.is_leader,
      order: member.order,
      projects: member.projects || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (member: Member) => {
    try {
      const res = await fetch(`/api/members/${member.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      loadMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Error al eliminar miembro');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members';
      const method = editingMember ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }

      resetForm();
      loadMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      alert('Error al guardar miembro');
    }
  };

  const columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'role', label: 'Rol' },
    { key: 'email', label: 'Email' },
    {
      key: 'orcid',
      label: 'ORCID',
      render: (item: Member) => (
        <span className="text-xs text-gray-500">{item.orcid || '-'}</span>
      ),
    },
    {
      key: 'is_leader',
      label: 'Líder',
      render: (item: Member) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${item.is_leader ? 'bg-uleam-gold text-uleam-blue' : 'bg-gray-200 text-gray-700'}`}>
          {item.is_leader ? 'Sí' : 'No'}
        </span>
      ),
    },
  ];

  return (
    <div>
      {!showForm ? (
        <DataTable
          title="Miembros del Equipo"
          columns={columns}
          data={members}
          loading={loading}
          onAdd={() => setShowForm(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-uleam-blue">
              {editingMember ? 'Editar Miembro' : 'Nuevo Miembro'}
            </h2>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              ← Volver
            </button>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-md max-w-2xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  placeholder="Nombre del miembro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rol *</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  placeholder="Ej: Investigador, Docente, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  placeholder="correo@uleam.edu.ec"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ORCID (opcional)</label>
                <input
                  type="text"
                  value={formData.orcid}
                  onChange={(e) => setFormData({ ...formData, orcid: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  placeholder="0000-0000-0000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Proyectos (en qué páginas aparece este miembro)</label>
                <div className="space-y-2">
                  {PROJECT_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.projects.includes(opt.value)}
                        onChange={(e) => {
                          const projects = e.target.checked
                            ? [...formData.projects, opt.value]
                            : formData.projects.filter((p) => p !== opt.value);
                          setFormData({ ...formData, projects });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_leader}
                      onChange={(e) => setFormData({ ...formData, is_leader: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-medium text-gray-700">Es líder</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                className="flex-1 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition"
              >
                {editingMember ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
