import { getAppSessionFromCookies, type AppSession } from "@/lib/session";
import { puedeGestionarInvestigacion } from "@/lib/modulos";

/**
 * Las API routes de /investigacion/informes NUNCA pasan por middleware.ts (su
 * matcher excluye /api explícitamente) — mismo problema documentado en
 * app/utilidades/_lib/auth.ts. Sin este chequeo, cualquiera con sesión pero
 * sin el módulo investigación podría generar informes de otra persona.
 */
export async function requireInvestigacionApi(): Promise<AppSession | null> {
  const usuario = await getAppSessionFromCookies();
  if (!usuario) return null;
  if (!puedeGestionarInvestigacion(usuario)) return null;
  return usuario;
}
