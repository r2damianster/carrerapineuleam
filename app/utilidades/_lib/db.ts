import { neon } from "@neondatabase/serverless";

/**
 * Cliente SQL de Neon. Reemplaza `logic/titulacion_db.py:get_conn()`.
 *
 * Instanciado de forma perezosa detrás de un Proxy (no
 * `export const sql = neon(...)` directo): ese patrón ejecutaba `neon()`
 * apenas Next importaba este archivo — incluido durante "Collecting page
 * data" en el build — y si `DATABASE_URL` no era válido en ese entorno
 * (ej. Preview de Vercel, distinto de Production) tumbaba el build
 * completo. Los ~20 call-sites en `docentes.ts`/`titulacionDb.ts`/
 * `titulacionLogic.ts` siguen usando `sql\`...\`` sin cambios — el Proxy
 * solo difiere la creación real del cliente hasta el primer uso.
 */
function crearCliente() {
  return neon(process.env.DATABASE_URL!);
}
type Cliente = ReturnType<typeof crearCliente>;

let cliente: Cliente | null = null;
function obtenerCliente(): Cliente {
  if (!cliente) cliente = crearCliente();
  return cliente;
}

export const sql: Cliente = new Proxy((() => {}) as any, {
  apply: (_target, _thisArg, args: any[]) => (obtenerCliente() as any)(...args),
  get: (_target, prop) => (obtenerCliente() as any)[prop],
}) as Cliente;
