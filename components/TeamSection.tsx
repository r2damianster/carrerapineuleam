'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Member } from '@/types';
import { useLanguage } from '@/lib/i18n';

interface TeamSectionProps {
  project?: string; // filtra el equipo a mostrar por proyecto (ver types/index.ts:Member.projects)
}

export default function TeamSection({ project }: TeamSectionProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    // Load members from static data or use sample data
    const loadMembers = async () => {
      try {
        const url = project ? `/api/members?project=${encodeURIComponent(project)}` : '/api/members';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch members');
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : []);
      } catch (error) {
        // Fallback to sample data if static data is not available
        setMembers([
          {
            id: '1',
            name: 'Arturo Rodríguez',
            role: 'Líder del Proyecto',
            orcid: '0000-0000-0000-0000',
            email: 'arturo.rodriguez@uleam.edu.ec',
            photo: '/images/members/lider_arturo_rodriguez.jpg',
            is_leader: true,
            order: 1,
            created: '',
            updated: '',
          },
          {
            id: '2',
            name: 'Jhonny Villafuerte',
            role: 'Colíder del Proyecto',
            orcid: '0000-0000-0000-0000',
            email: 'jhonny.villafuerte@uleam.edu.ec',
            photo: '/images/members/colider_Jhonny_Villafuerte.jpg',
            is_leader: false,
            order: 2,
            created: '',
            updated: '',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [project]);

  if (loading) {
    return (
      <section id="equipo" className="py-10 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-bold text-uleam-blue">Cargando equipo...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="equipo" className="py-10 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">
            {t.team.sectionTitle}
          </h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Investigadores dedicados a transformar la educación
          </p>
        </div>

        {/* All members side by side */}
        <div className="grid grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4 max-w-6xl mx-auto justify-items-center">
          {members.map((member) => (
            <TeamCard key={member.id} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamCard({ member }: { member: Member }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border-2 border-uleam-gold w-full">
      {/* Photo */}
      <div className="relative h-24 sm:h-28 md:h-36 bg-gray-200">
        {member.photo ? (
          <Image
            src={member.photo}
            alt={member.name}
            fill
            className="object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <div className="absolute top-1 right-1 md:top-2 md:right-2 bg-uleam-gold text-uleam-blue px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold">
          {member.is_leader ? 'Líder' : member.order === 2 ? 'Colíder' : member.id === 'member_7' ? 'Vinculación' : 'Participante'}
        </div>
      </div>

      {/* Info */}
      <div className="p-2 md:p-4">
        <h3 className="text-xs sm:text-sm md:text-lg font-bold text-uleam-blue mb-0.5 md:mb-1 leading-tight">{member.name}</h3>
        <p className="text-gray-600 text-xs md:text-sm mb-1 md:mb-3 leading-tight">{member.role}</p>

        {member.orcid && (
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 01-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-1.913-1.237-3.722-3.984-3.722h-2.335z" />
            </svg>
            <a
              href={`https://orcid.org/${member.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-uleam-blue transition"
            >
              {member.orcid}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
