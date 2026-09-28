// Prueba unitaria pura de lib/topeInvitadosAsistencia.ts — sin DB, sin servidor.
// La lógica de negocio no depende de Neon; solo se prueba la fórmula y que el
// mensaje de rechazo del endpoint (copiado aquí literal) nunca exponga un número.
//
// node --experimental-strip-types scripts/test-tope-invitados.mjs
// (o: npx tsx scripts/test-tope-invitados.mjs)

import { calcularTopeInvitados } from '../lib/topeInvitadosAsistencia.ts';

const MENSAJE_RECHAZO = 'No se puede registrar este número de invitados para la cantidad de beneficiarios presentes en esta sesión. Revisa la asistencia registrada.';

let fallos = 0;

function assertEq(descripcion, actual, esperado) {
  if (actual !== esperado) {
    console.error(`❌ ${descripcion}: esperado ${esperado}, obtenido ${actual}`);
    fallos++;
  } else {
    console.log(`✅ ${descripcion}`);
  }
}

// --- Casos reales detectados en Neon (deben quedar bloqueados por el tope) ---
assertEq('id25 — 1 ben, 2 titulares presentes → tope 0', calcularTopeInvitados(1, 2), 0);
assertEq('id22 — 2 ben, 2 titulares presentes → tope 0', calcularTopeInvitados(2, 2), 0);
assertEq('id21 — 1 ben, 2 titulares presentes (2 invitados pedidos) → tope 0', calcularTopeInvitados(1, 2), 0);
assertEq('id20 — 1 ben, 2 titulares presentes → tope 0', calcularTopeInvitados(1, 2), 0);

// --- Caso real que nunca pidió invitado y no debe bloquearse si lo pidiera ---
assertEq('id14 — 13 ben, 2 titulares presentes → tope 5 (nunca se acerca a bloquear)', calcularTopeInvitados(13, 2), 5);
assertEq('espacio 11 — 11 ben, 1 titular presente → tope 5', calcularTopeInvitados(11, 1), 5);

// --- Ausencia real: titular falta, debe permitir cubrir sin pedir "caso especial" ---
assertEq('2 asignados, 1 falta (1 titular presente), 5 ben → deficit cubierto', calcularTopeInvitados(5, 1), Math.max(0, Math.ceil(5 / 2) - 1));

// --- Piso de seguridad: nadie titular presente, siempre permite al menos 1 ---
assertEq('0 titulares presentes, 1 beneficiario → piso de seguridad = 1', calcularTopeInvitados(1, 0), 1);
assertEq('0 titulares presentes, 0 beneficiarios → 0 (no hay sesión real)', calcularTopeInvitados(0, 0), 0);

// --- Simetría: mismo total de personal, sin importar titular vs invitado ---
assertEq('20 ben, 0 titulares (todo invitado) → tope 10', calcularTopeInvitados(20, 0), 10);
assertEq('20 ben, 2 titulares + hasta 8 invitados → tope 8', calcularTopeInvitados(20, 2), 8);

// --- El mensaje de rechazo nunca debe contener un dígito (no revelar el tope calculado) ---
assertEq('mensaje de rechazo sin dígitos', /\d/.test(MENSAJE_RECHAZO), false);

if (fallos > 0) {
  console.error(`\n${fallos} prueba(s) fallaron.`);
  process.exit(1);
}
console.log('\nTodas las pruebas pasaron.');
