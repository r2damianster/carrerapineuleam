import Image from 'next/image';

const testimonios = [
  {
    nombre: 'Tania Chávez, PhD',
    institucion: 'Universidad Laica Eloy Alfaro de Manabí',
    foto: '/images/redlea/03-testimonios/01-imagen.jpeg',
    texto: 'Formar parte del Grupo de Investigación LEA representa una experiencia enriquecedora que ha contribuido significativamente a mi trayectoria académica. La RED LEA es una comunidad que promueve el aprendizaje permanente, el trabajo colaborativo y la construcción colectiva del conocimiento.',
  },
  {
    nombre: 'Lic. Johanna Patricia Rodríguez Estacio, Mg.',
    institucion: 'Universidad Técnica "Luis Vargas Torres" de Esmeraldas',
    foto: '/images/redlea/03-testimonios/02-imagen.png',
    texto: 'Esta experiencia me ha ayudado a comprender mejor a mis estudiantes, sus necesidades y diversas formas de aprender. He reflexionado sobre la relevancia de innovar las formas de enseñanza y generar ambientes de aprendizaje dinámicos, significativos e inclusivos.',
  },
  {
    nombre: 'Ps. Jhonna Bello Piguave, Mg.',
    institucion: 'Universidad Laica Eloy Alfaro de Manabí',
    foto: '/images/redlea/03-testimonios/03-imagen.jpeg',
    texto: 'La REDLEA se ha convertido en un espacio de encuentro, escucha y motivación. En REDLEA no solo se construyen proyectos, sino que también se fortalecen los lazos de compañerismo, confianza y apoyo mutuo, elementos fundamentales para afrontar los desafíos.',
  },
  {
    nombre: 'Lic. Isabel de los Ángeles García Farfán, Mg.',
    institucion: 'Universidad Técnica de Manabí',
    foto: '/images/redlea/03-testimonios/04-imagen.jpeg',
    texto: 'Mi experiencia en la Red LEA ha sido profundamente enriquecedora; ha permitido el intercambio académico con docentes e investigadores de otras instituciones, promoviendo el aprendizaje colaborativo y reflejándose directamente en mi práctica docente.',
  },
  {
    nombre: 'Teresa Zambrano Ortega, PhD',
    institucion: 'PUCESD',
    foto: '/images/redlea/03-testimonios/05-imagen.png',
    texto: 'Pertenecer a la RED LEA ha sido mucho más que una experiencia académica. Cada conversación ha reafirmado mi convicción de que el trabajo colaborativo nos fortalece, amplía nuestra mirada y nos inspira a seguir creciendo como profesores.',
  },
  {
    nombre: 'Dra Tahimi Achilie Valencia, PhD',
    institucion: 'Pontificia Universidad Católica del Ecuador Sede Esmeraldas',
    foto: '/images/redlea/03-testimonios/06-imagen.jpeg',
    texto: 'Formar parte de la RED LEA "Cambiando Vidas" ha representado encontrar un espacio donde el intercambio de ideas es permanente, el conocimiento se comparte y las personas crecen juntas en un contexto de transformación educativa.',
  },
];

export default function RedLEATestimonios() {
  return (
    <section id="testimonios" className="w-full py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue text-center mb-16">
          Testimonios
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonios.map((t, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition hover:scale-105 transform"
            >
              {/* Foto */}
              <div className="relative w-full h-48 overflow-hidden bg-gray-200">
                <Image
                  src={t.foto}
                  alt={t.nombre}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>

              {/* Contenido */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-uleam-blue mb-1">
                  {t.nombre}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{t.institucion}</p>
                <p className="text-gray-700 text-sm leading-relaxed italic">
                  "{t.texto}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
