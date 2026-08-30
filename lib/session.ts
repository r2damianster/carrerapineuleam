export interface AppSession {
  id: string;
  email: string;
  nombres: string;
  rol: string;
  modulos_acceso: string[];
}

const SESSION_COOKIE_NAME = 'pine_app_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || 'fallback_secret_pine_2026';
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionCookieValue(session: AppSession): Promise<string> {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(session)));
  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const signature = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${payload}.${signature}`;
}

export async function verifySessionCookieValue(cookieValue: string | undefined | null): Promise<AppSession | null> {
  if (!cookieValue) return null;
  const [payload, signature] = cookieValue.split('.');
  if (!payload || !signature) return null;

  const key = await getHmacKey();
  let isValid: boolean;
  try {
    isValid = await crypto.subtle.verify('HMAC', key, base64UrlDecode(signature) as BufferSource, new TextEncoder().encode(payload));
  } catch {
    return null;
  }
  if (!isValid) return null;

  try {
    const json = new TextDecoder().decode(base64UrlDecode(payload));
    return JSON.parse(json) as AppSession;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = {
  name: SESSION_COOKIE_NAME,
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export interface EstudianteSession {
  id: string;
  nombre: string;
  email: string;
  modalidad: string | null;
}

// Retro-compatibility with Claude's code
export async function getSessionFromCookies(): Promise<EstudianteSession | null> {
  const cookieStore = await import('next/headers').then(m => m.cookies());
  const session = await verifySessionCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;
  return {
    id: session.id,
    nombre: session.nombres,
    email: session.email,
    modalidad: null
  };
}
