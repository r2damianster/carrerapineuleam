'use client';

import BancoFotos from '@/components/fotos/BancoFotos';

// Banco de fotos (WP8): la lógica vive en el componente compartido con el panel de líderes
// (/portal/proyecto/[proyectoId]/fotos). El acceso a /admin/* lo protege middleware.ts
// (módulo contenido_sitio) y cada API valida de nuevo en el servidor.
export default function AdminPhotosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Banco de fotos</h1>
        <p className="text-sm text-gray-600">
          Aquí llegan las fotos que suben los pasantes y los líderes. Elige en qué páginas del sitio se publican; cada espacio tiene un máximo de fotos visibles.
        </p>
      </div>
      <BancoFotos modo="admin" />
    </div>
  );
}
