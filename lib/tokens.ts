// Los enlaces/QR públicos (enlaces_evaluacion, enlaces_difusion) usan un UUID como token.
// Un token mal formado debe responder 404, no un 500 por el cast a uuid de Postgres.
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esTokenEnlaceValido(token: unknown): token is string {
  return typeof token === 'string' && PATRON_UUID.test(token);
}
