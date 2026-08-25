import PocketBase from 'pocketbase';

export const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

export interface Estudiante {
  id: string;
  nombre: string;
  carrera: string;
  rol: string;
  modalidad: 'club_ingles' | 'podcast' | 'investigacion' | 'otro' | '';
}

export interface Espacio {
  id: string;
  nombre: string;
  tipo: 'aula' | 'comunidad' | '';
  semestre_activo: string;
}

export interface Beneficiario {
  id: string;
  nombre: string;
  contacto: string;
  situacion_laboral_inicial: string;
}
