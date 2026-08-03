import Link from 'next/link';

export default function RedLEAHero() {
  return (
    <section className="relative w-full min-h-screen bg-gradient-to-br from-uleam-blue via-blue-700 to-blue-900 text-white flex items-center justify-center px-4 py-20">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full filter blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-uleam-gold rounded-full filter blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            RED LEA
          </h1>
          <p className="text-2xl md:text-3xl font-light text-blue-100 mb-2">
            Cambiando Vidas
          </p>
          <p className="text-lg md:text-xl text-blue-200 italic">
            "La lectura y la escritura pueden transformar vidas"
          </p>
        </div>

        <div className="mb-12">
          <p className="text-lg text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Red de Cooperación para la Investigación Científica sobre Lectura y Escritura Académica — Organización independiente sin fines de lucro dedicada a promover la investigación científica, la innovación pedagógica y la transformación educativa en Iberoamérica.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="#sobre"
            className="px-8 py-3 bg-uleam-gold text-uleam-blue font-bold rounded-lg hover:bg-yellow-400 transition"
          >
            Conocer más
          </Link>
          <Link
            href="/"
            className="px-8 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-uleam-blue transition"
          >
            ← Volver a Innovaciones
          </Link>
        </div>
      </div>
    </section>
  );
}
