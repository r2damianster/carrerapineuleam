// Web Crypto (crypto.subtle) so this module works both in Node.js API routes
// and in the Edge runtime used by middleware.ts.

export interface AdminSession {
  id: string;
  email: string;
  role: string;
}

const ADMIN_SESSION_COOKIE_NAME = 'admin_session';
const ADMIN_SESSION_MAX_AGE_SECONDS = 5 * 24 * 60 * 60;

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET no está configurado');
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

export async function createAdminSessionCookieValue(session: AdminSession): Promise<string> {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(session)));
  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const signature = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${payload}.${signature}`;
}

export async function verifyAdminSessionCookieValue(cookieValue: string | undefined | null): Promise<AdminSession | null> {
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
    return JSON.parse(json) as AdminSession;
  } catch {
    return null;
  }
}

export const ADMIN_SESSION_COOKIE = {
  name: ADMIN_SESSION_COOKIE_NAME,
  maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
};
