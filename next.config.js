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
    },
  },
};

export default nextConfig;
