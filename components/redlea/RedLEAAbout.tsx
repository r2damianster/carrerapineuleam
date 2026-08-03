export default function RedLEAAbout() {
  const universidades = [
    'Universidad Técnica de Manabí (UTM)',
    'Pontificia Universidad Católica del Ecuador Sede Esmeraldas (PUCESE)',
    'Pontificia Universidad Católica del Ecuador Sede Santo Domingo (PUCESD)',
    'Universidad Técnica de Esmeraldas Luis Vargas Torres (UTELVT)',
  ];

  return (
    <section id="sobre" className="w-full py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        {/* Introducción */}
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-8">
            ¿Qué es la RED LEA "Cambiando Vidas"?
          </h2>

          <div className="prose max-w-none text-lg text-gray-700 space-y-6">
            <p>
              La <strong>Red de Cooperación para la Investigación Científica sobre Lectura y Escritura Académica (RED-LEA)</strong> es una organización de investigadores constituida como una persona jurídica de derecho privado, sin fines de lucro, de carácter independiente y con autonomía patrimonial, administrativa y financiera. Su creación responde al compromiso de promover la investigación científica en los procesos educativos y contribuir al fortalecimiento de la calidad de la educación.
            </p>

            <p>
              La RED-LEA surge como una oportunidad para impulsar la transformación de los paradigmas educativos y sociales, con la convicción de que <strong>la lectura y la escritura constituyen herramientas fundamentales para el desarrollo humano, el pensamiento crítico y la construcción de una convivencia pacífica.</strong>
            </p>

            <p>
              Desde una perspectiva progresista, inclusiva y sostenible, la RED LEA promueve iniciativas que favorecen el aprendizaje, la producción de conocimiento y la formación integral de las personas.
            </p>
          </div>
        </div>

        {/* Propósito */}
        <div className="mb-16 bg-blue-50 p-8 rounded-lg border-l-4 border-uleam-blue">
          <h3 className="text-2xl font-bold text-uleam-blue mb-4">Propósito</h3>
          <p className="text-lg text-gray-700">
            Contribuir al mejoramiento de las prácticas educativas en los diferentes niveles de formación, fomentando el gusto por la lectura mediante estrategias innovadoras. La RED-LEA promueve la escritura académica como un medio para fortalecer el pensamiento, la creatividad y la comunicación científica, ofreciendo espacios de capacitación, asesoría, acompañamiento y publicación de producciones intelectuales.
          </p>
        </div>

        {/* Quiénes somos */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">¿Quiénes somos?</h3>
          <p className="text-lg text-gray-700 mb-6">
            Somos profesores universitarios y docentes de educación secundaria, estudiantes y profesionales de diversas nacionalidades, culturas, etnias, identidades y creencias, unidos por el compromiso de fortalecer la educación mediante la investigación, la innovación pedagógica, la promoción de la lectura y la escritura, y la construcción colectiva del conocimiento como aporte al mejoramiento de los sistemas educativos en Iberoamérica.
          </p>
          <p className="text-lg text-gray-700">
            Desde su creación en la <strong>Universidad Laica Eloy Alfaro de Manabí (ULEAM) en el 2020</strong>, la Red ha impulsado proyectos de investigación, actividades de formación, publicaciones científicas y alianzas estratégicas con instituciones nacionales e internacionales.
          </p>
        </div>

        {/* Universidades co-fundadoras */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">Universidades co-fundadoras</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {universidades.map((uni, idx) => (
              <div
                key={idx}
                className="p-4 bg-gradient-to-r from-blue-100 to-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition"
              >
                <p className="font-semibold text-uleam-blue">{uni}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Organización */}
        <div>
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">Estructura organizativa</h3>
          <p className="text-lg text-gray-700 mb-4">
            La organización se fundamenta en una gestión participativa, basada en la comunicación horizontal, la cooperación y el trabajo colaborativo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Asamblea General',
              'Comité Científico',
              'Coordinador/a General',
              'Coordinadores de Subáreas',
              'Responsables de Comisiones',
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="w-3 h-3 bg-uleam-gold rounded-full mr-3" />
                <span className="text-gray-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
