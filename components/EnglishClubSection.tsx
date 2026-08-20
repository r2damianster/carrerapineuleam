'use client';

import Image from 'next/image';
import { vinculacionEnglishClubPhotos } from '@/lib/data';
import { useLanguage } from '@/lib/i18n';

export default function EnglishClubSection() {
  const { t } = useLanguage();
  const p = t.vinculacionProject;

  return (
    <section className="py-10 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-4">{p.englishClubSectionTitle}</h2>
          <div className="w-24 h-1 bg-uleam-gold mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">{p.englishClubSectionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {vinculacionEnglishClubPhotos.map((photo) => (
            <figure key={photo.id} className="bg-gray-50 rounded-xl overflow-hidden shadow-md">
              <div className="relative aspect-video">
                <Image src={photo.image} alt={photo.caption} fill className="object-cover" />
              </div>
              <figcaption className="p-4 text-sm text-gray-700">
                {photo.caption}
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">{p.englishClubComingSoon}</p>
      </div>
    </section>
  );
}
