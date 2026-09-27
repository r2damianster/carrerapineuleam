// scripts/migrate-reconectar-permisos-pertenencia.js — Sesión 53 (H1)
//
// Reconecta lib/permisosPertenencia.ts (Sesión 51), desconectado sin darse cuenta por un
// auto-commit posterior (136f028). Antes de activar los dos puntos de escritura que llaman
// recalcularModulos() (POST/PATCH /api/members, PATCH /api/admin/roles), este script siembra
// `modulos_manuales`/`modulos_excluidos` de cada docente para que el efectivo calculado hoy
// sea IDÉNTICO a su `modulos_acceso` actual — nadie gana ni pierde nada al desplegar esto.
//
// No importa lib/*.ts (los scripts de este repo son .js planos, sin transpilador) — la consulta
// de derivación está copiada tal cual de lib/permisosPertenencia.ts:calcularModulosDerivadosDeTodos;
// si esa lógica cambia, actualizar también aquí.
//
//   node --env-file=.env.local scripts/migrate-reconectar-permisos-pertenencia.js            → SIMULACIÓN
//   node --env-file=.env.local scripts/migrate-reconectar-permisos-pertenencia.js --aplicar   → aplica
//
// Sin ALTER TABLE (las columnas ya existen desde la Sesión 51). Reintentable.

import { neon } from '@neondatabase/serverless';

const APLICAR = process.argv.includes('--aplicar');
const sql = neon(process.env.DATABASE_URL);

async function calcularModulosDerivadosDeTodos() {
  const filas = await sql`
    SELECT usuario_id, array_agg(DISTINCT modulo) AS modulos FROM (
      SELECT usuario_id, 'vinculacion'::text AS modulo FROM proyecto_miembros
        WHERE activo AND proyecto_id = 'vinculacion' AND rol_en_proyecto IN ('supervisor', 'lider')
      UNION ALL
      SELECT usuario_id, 'vinculacion_gestion' FROM proyecto_miembros
        WHERE activo AND proyecto_id = 'vinculacion' AND rol_en_proyecto = 'lider'
      UNION ALL
      SELECT pm.usuario_id, 'investigacion' FROM proyecto_miembros pm JOIN proyectos p ON p.id = pm.proyecto_id
        WHERE pm.activo AND pm.rol_en_proyecto = 'lider' AND p.area = 'investigacion'
    ) derivados GROUP BY usuario_id`;
  const mapa = {};
  for (const fila of filas) mapa[Number(fila.usuario_id)] = fila.modulos;
  return mapa;
}

async function main() {
  console.log(APLICAR ? '=== MODO APLICAR ===' : '=== SIMULACIÓN (usa --aplicar para escribir) ===');

  const docentes = await sql`
    SELECT id, email, rol, modulos_acceso, modulos_manuales, modulos_excluidos
    FROM usuarios WHERE rol IN ('profesor', 'admin') ORDER BY id`;
  const derivadosPorUsuario = await calcularModulosDerivadosDeTodos();

  const reporte = [];
  for (const persona of docentes) {
    const actuales = new Set(persona.modulos_acceso ?? []);
    // superadmin lo maneja aparte recalcularModulos(); nunca debe verse en manuales/excluidos.
    const derivados = new Set((derivadosPorUsuario[Number(persona.id)] ?? []).filter((modulo) => modulo !== 'superadmin'));
    const manuales = [...actuales].filter((modulo) => modulo !== 'superadmin' && !derivados.has(modulo));
    const excluidos = [...derivados].filter((modulo) => !actuales.has(modulo));

    const cambiaManuales = JSON.stringify([...manuales].sort()) !== JSON.stringify([...(persona.modulos_manuales ?? [])].sort());
    const cambiaExcluidos = JSON.stringify([...excluidos].sort()) !== JSON.stringify([...(persona.modulos_excluidos ?? [])].sort());
    if (cambiaManuales || cambiaExcluidos) {
      reporte.push({ email: persona.email, actuales: [...actuales], derivados: [...derivados], manuales, excluidos });
      if (APLICAR) {
        await sql`UPDATE usuarios SET modulos_manuales = ${manuales}, modulos_excluidos = ${excluidos} WHERE id = ${persona.id}`;
      }
    }
  }
  console.log(`Docentes con siembra nueva/actualizada: ${reporte.length} de ${docentes.length}`);
  console.log(JSON.stringify(reporte, null, 2));

  // Verificación: recalcular efectivo con la MISMA fórmula de recalcularModulos() y comparar
  // contra modulos_acceso actual — debe coincidir para todos (nadie gana/pierde nada hoy).
  let coinciden = 0;
  const difieren = [];
  for (const persona of docentes) {
    const antes = [...(persona.modulos_acceso ?? [])].sort();
    const derivados = new Set((derivadosPorUsuario[Number(persona.id)] ?? []));
    const manualesFinal = APLICAR
      ? [...new Set(persona.modulos_acceso ?? [])].filter((m) => m !== 'superadmin' && !derivados.has(m))
      : (reporte.find((r) => r.email === persona.email)?.manuales ?? persona.modulos_manuales ?? []);
    const excluidosFinal = APLICAR
      ? [...derivados].filter((m) => m !== 'superadmin' && !(persona.modulos_acceso ?? []).includes(m))
      : (reporte.find((r) => r.email === persona.email)?.excluidos ?? persona.modulos_excluidos ?? []);
    let efectivos = Array.from(new Set([...derivados, ...manualesFinal])).filter((m) => !excluidosFinal.includes(m));
    if ((persona.modulos_acceso ?? []).includes('superadmin') && !efectivos.includes('superadmin')) efectivos.push('superadmin');
    if (efectivos.includes('vinculacion_gestion') && !efectivos.includes('vinculacion')) efectivos.push('vinculacion');
    efectivos = efectivos.sort();
    if (JSON.stringify(antes) === JSON.stringify(efectivos)) coinciden++;
    else difieren.push({ email: persona.email, antes, ahora: efectivos });
  }
  console.log(`Verificación (fórmula de recalcularModulos): ${coinciden}/${docentes.length} coinciden con el modulos_acceso actual.`);
  if (difieren.length > 0) console.log('⚠️ DIFIEREN (revisar antes de confiar en la reconexión):', JSON.stringify(difieren, null, 2));
}

main().catch((error) => { console.error('ERROR:', error.message); process.exit(1); });
