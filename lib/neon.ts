import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL!);

export interface Estudiante {
  id: string;
  nombre: string;
  carrera: string | null;
  rol: string | null;
  modalidad: 'club_ingles' | 'podcast' | 'investigacion' | 'otro' | null;
}

export interface Espacio {
  id: string;
  nombre: string;
  tipo: 'aula' | 'comunidad' | null;
  semestre_activo: string | null;
}

export interface Beneficiario {
  id: string;
  nombre: string;
  contacto: string | null;
  situacion_laboral_inicial: string | null;
}
