import { getAppSessionFromCookies, type AppSession } from "@/lib/session";

/**
 * Las API routes de /utilidades NUNCA pasan por middleware.ts (su matcher excluye
 * /api explícitamente) — a diferencia de las páginas, que sí quedan protegidas ahí.
 * Sin este chequeo, cualquiera sin sesión podía generar documentos institucionales
 * o leer/modificar evaluaciones de Pares Lectores solo conociendo la URL. Mismo
 * criterio que ya usa middleware.ts para las páginas de /utilidades: profesor o admin.
 */
export async function requireDocenteApi(): Promise<AppSession | null> {
  const usuario = await getAppSessionFromCookies();
  if (!usuario || !["profesor", "admin"].includes(usuario.rol)) return null;
  return usuario;
}
