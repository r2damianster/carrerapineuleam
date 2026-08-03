import Image from 'next/image';

const fotos = [
  '/images/redlea/05-memoria/02-imagen.jpeg',
  '/images/redlea/05-memoria/03-imagen.jpeg',
  '/images/redlea/05-memoria/04-imagen.jpeg',
  '/images/redlea/05-memoria/10-imagen.jpeg',
  '/images/redlea/05-memoria/11-imagen.jpeg',
  '/images/redlea/05-memoria/12-imagen.jpeg',
];

export default function RedLEAMemoria() {
  return (
    <section id="memoria" className="w-full py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue text-center mb-4">
          Primer Encuentro Interuniversidades
        </h2>
        <p className="text-center text-gray-600 text-lg mb-12">
          Innovaciones educativas: Experiencias de vinculación social, prácticas preprofesionales, proyectos de investigación
          <br />
          <span className="font-semibold">Manta: 26 y 27 de junio de 2025</span>
        </p>

        {/* Resumen */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-12">
          <h3 className="text-2xl font-bold text-uleam-blue mb-4">Presentación</h3>
          <div className="prose max-w-none text-gray-700 space-y-4">
            <p>
              La presente memoria recoge las experiencias, reflexiones y principales resultados del <strong>Primer Encuentro Interuniversidades</strong>, realizado los días 26 y 27 de junio de 2025 en la Universidad Laica Eloy Alfaro de Manabí (ULEAM), bajo la organización de la Red LEA "Cambiando Vidas".
            </p>
            <p>
              Este encuentro permitió el <strong>intercambio de conocimientos, investigaciones y experiencias</strong> en torno a las funciones sustantivas de la educación superior: docencia, investigación y vinculación con la sociedad. A través de conferencias y espacios de diálogo académico, se promovió la construcción de alianzas orientadas al fortalecimiento de la calidad educativa.
            </p>
            <p>
              El presente documento constituye un testimonio del trabajo conjunto realizado por las instituciones participantes y refleja el espíritu de colaboración, aprendizaje y compromiso que caracteriza a los integrantes de RED LEA.
            </p>
          </div>
        </div>

        {/* Objetivo */}
        <div className="bg-blue-50 border-l-4 border-uleam-gold p-8 mb-12 rounded-r-lg">
          <h3 className="text-2xl font-bold text-uleam-blue mb-4">Objetivo del Encuentro</h3>
          <p className="text-lg text-gray-700">
            Fortalecer la cooperación académica e investigativa con la participación de universidades nacionales e internacionales, promoviendo el intercambio de experiencias, investigaciones e innovaciones relacionadas con las funciones sustantivas de la educación superior.
          </p>
        </div>

        {/* Universidades participantes */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">Universidades Participantes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Universidad Laica Eloy Alfaro de Manabí (ULEAM) — Institución anfitriona',
              'Universidad del País Vasco (UPV/EHU)',
              'Pontificia Universidad Católica del Ecuador Sede Esmeraldas (PUCESE)',
              'Universidad Técnica Luis Vargas Torres de Esmeraldas (UTLVT)',
              'Pontificia Universidad Católica del Ecuador Sede Santo Domingo (PUCESD)',
            ].map((uni, idx) => (
              <div key={idx} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <p className="text-gray-700">{uni}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Logros */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">Principales Logros</h3>
          <ul className="space-y-3">
            {[
              'Consolidación de alianzas estratégicas entre universidades nacionales e internacionales',
              'Fortalecimiento de la Red LEA "Cambiando Vidas" como espacio permanente de cooperación académica',
              'Intercambio de experiencias exitosas sobre docencia, investigación y vinculación con la sociedad',
              'Participación activa de investigadores y docentes de diversas instituciones de educación superior',
              'Promoción de nuevas líneas de investigación conjunta entre las universidades participantes',
              'Desarrollo de actividades de formación continua mediante capacitación internacional',
              'Publicación de libro científico colectivo: "Innovaciones Educativas: Experiencias de Vinculación Social, Prácticas Preprofesionales, Proyectos de Investigación" (20 capítulos, 175 páginas, 40+ autores)',
            ].map((logro, idx) => (
              <li key={idx} className="flex items-start p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <span className="text-green-600 font-bold mr-4">✓</span>
                <span className="text-gray-700">{logro}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Proyecciones 2026 */}
        <div className="bg-yellow-50 p-8 rounded-lg border border-uleam-gold mb-12">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">Retos y Proyecciones 2026</h3>
          <ul className="space-y-2 text-gray-700">
            {[
              'Realizar el Segundo Encuentro Interuniversidades de la Red LEA (previsto para 6 y 7 de agosto de 2026)',
              'Desarrollar jornadas académicas dirigidas a estudiantes y docentes de la Universidad Técnica de Manabí',
              'Organizar taller especializado de Lengua y Literatura con conferencista internacional',
              'Promover ciclo de ponencias sobre Mentoría e Investigación Educativa',
              'Planificar proyectos colaborativos de investigación para 2026–2027',
              'Publicar segundo libro con investigaciones y ponencias de la RED LEA',
            ].map((reto, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-uleam-blue font-bold mr-3">→</span>
                <span>{reto}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Galería Memoria */}
        <div>
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">Momentos del Encuentro</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fotos.map((foto, idx) => (
              <div
                key={idx}
                className="relative h-40 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition"
              >
                <Image
                  src={foto}
                  alt={`Momento ${idx + 1}`}
                  fill
                  className="object-cover hover:scale-110 transition duration-300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
