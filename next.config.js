/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
    // pdfjs-dist carga su worker (pdf.worker.mjs) con una ruta que el file
    // tracing de Next/Vercel no detecta estáticamente -- sin esto, el archivo
    // no se sube a la función serverless y falla "Cannot find module .../pdf.worker.mjs".
    outputFileTracingIncludes: {
      '/utilidades/pares-lectores/api/precargar-memo': ['./node_modules/pdfjs-dist/legacy/build/*.mjs'],
      // Todas las plantillas .docx que el código lee con fs en tiempo de ejecución (movidas a /templates en Sesión 58) --
      // sin esto, Vercel no las incluye en la función serverless y falla "ENOENT" solo en producción, nunca en local.
      '/vinculacion/informes/api': ['./templates/informe-vinculacion-*.docx'],
      '/investigacion/informes/api/descargar': ['./templates/informe-investigacion-mensual.docx'],
      '/utilidades/acta-tecnica/api': ['./templates/utilidades-acta-tecnica.docx'],
      '/utilidades/oficios/api': ['./templates/utilidades-oficio-hoja-carrera.docx'],
      '/utilidades/convocatorias/api/docente': ['./templates/utilidades-convocatoria-docentes.docx'],
      '/utilidades/convocatorias/api/estudiante': ['./templates/utilidades-convocatoria-estudiantes.docx'],
      '/utilidades/pat-maestria/api': ['./templates/utilidades-pat-maestria-*.docx'],
      '/utilidades/pares-lectores/api/evaluacion/[id]/generar': ['./templates/utilidades-rubrica-*.docx'],
    },
  },
};

export default nextConfig;
