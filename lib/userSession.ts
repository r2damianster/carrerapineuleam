import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export interface UsuarioSession {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  rol: 'admin' | 'profesor' | 'estudiante' | 'beneficiario';
}

const USER_SESSION_COOKIE_NAME = 'usuario_session';
const USER_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET no está configurado');
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createUserSessionCookieValue(session: UsuarioSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyUserSessionCookieValue(cookieValue: string | undefined): UsuarioSession | null {
  if (!cookieValue) return null;
  const [payload, signature] = cookieValue.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

export const USER_SESSION_COOKIE = {
  name: USER_SESSION_COOKIE_NAME,
  maxAge: USER_SESSION_MAX_AGE_SECONDS,
};

export async function getUserSessionFromCookies(): Promise<UsuarioSession | null> {
  const cookieStore = await cookies();
  return verifyUserSessionCookieValue(cookieStore.get(USER_SESSION_COOKIE_NAME)?.value);
}
