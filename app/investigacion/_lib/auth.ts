import { getAppSessionFromCookies, type AppSession } from "@/lib/session";

/**
 * Las API routes de /investigacion/informes NUNCA pasan por middleware.ts (su
 * matcher excluye /api explícitamente) — mismo problema documentado en
 * app/utilidades/_lib/auth.ts. Sin este chequeo, cualquiera con sesión pero
 * sin el módulo investigación podría generar informes de otra persona.
 */
export async function requireInvestigacionApi(): Promise<AppSession | null> {
  const usuario = await getAppSessionFromCookies();
  if (!usuario) return null;
  if (!["profesor", "admin"].includes(usuario.rol)) return null;
  if (!usuario.modulos_acceso?.some((m) => m === "investigacion" || m === "admin")) return null;
  return usuario;
}
