import { redirect } from 'next/navigation';

// El editor de datos del proyecto ya no es exclusivo de Vinculación: vive en /portal/proyecto/[id]/gestion.
export default function ProyectoVinculacionRedirect() {
  redirect('/portal/proyecto/vinculacion/gestion');
}
