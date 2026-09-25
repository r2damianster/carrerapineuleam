// scripts/backfill-fotos-banco.js — WP7 del plan docs/PLAN_IMPLEMENTACION_ANTIGRAVITY_ADMIN_POR_LIDERES.md
//
// Sube a Cloudinary las imágenes locales (/images/...) y registra en el banco `fotos` lo que hoy vive
// en otras tablas (fotos de eventos/noticias, portadas de podcast y fotos de asistencia).
//
//   node --env-file=.env.local scripts/backfill-fotos-banco.js            → SIMULACIÓN (no escribe nada)
//   node --env-file=.env.local scripts/backfill-fotos-banco.js --aplicar  → aplica
//
// Reintentable: los archivos locales se suben una sola vez (public_id determinista, se reusa si ya
// existe) y los INSERT usan el índice único (origen, fuente_id, url) con ON CONFLICT DO NOTHING.
// Nunca borra archivos de public/ ni filas. Requiere haber corrido scripts/migrate-fotos-banco.js.

import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { v2 as cloudinary } from 'cloudinary';

const APLICAR = process.argv.includes('--aplicar');
const MAX_BYTES = 10 * 1024 * 1024; // límite de Cloudinary en el plan gratuito
const CARPETA_CLOUDINARY = 'pine_project_uploads/legado';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const esLocal = (url) => typeof url === 'string' && url.startsWith('/');
const esCloudinary = (url) => typeof url === 'string' && url.includes('res.cloudinary.com');

function rutaAbsolutaDeLocal(urlLocal) {
  return path.join(process.cwd(), 'public', decodeURI(urlLocal).replace(/^\/+/, ''));
}

function publicIdDeLocal(urlLocal) {
  const sinExtension = decodeURI(urlLocal).replace(/^\/+/, '').replace(/\.[a-z0-9]+$/i, '');
  const limpio = sinExtension.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9/_-]+/g, '_');
  return `${CARPETA_CLOUDINARY}/${limpio}`;
}

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  console.log(APLICAR ? '=== MODO APLICAR ===' : '=== SIMULACIÓN (usa --aplicar para escribir) ===');

  // 0. Prerrequisitos
  const [{ respaldo }] = await sql`SELECT to_regclass('respaldo_fotos_20260926') IS NOT NULL AS respaldo`;
  const [{ tiene_columna }] = await sql`
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fotos' AND column_name = 'proyectos') AS tiene_columna`;
  if (!respaldo || !tiene_columna) throw new Error('Falta correr scripts/migrate-fotos-banco.js (respaldo o columnas nuevas).');

  // 1. Reunir fuentes
  const fotosExistentes = await sql`SELECT id, url, ubicaciones FROM fotos`;
  const urlsEnBanco = new Set(fotosExistentes.map((foto) => foto.url));

  const actividades = await sql`
    SELECT id, tipo, fecha, categoria, origen, aprobado_sitio, registrador_id, photos, evidencia_url
    FROM actividades_difusion`;
  const asistencias = await sql`
    SELECT ae.id, ae.fecha, ae.foto_url, ae.foto_public_id, ae.registrado_por
    FROM asistencia_espacio ae WHERE ae.foto_url IS NOT NULL`;

  // Candidatos a insertar (url original → se convertirá a Cloudinary si es local)
  const candidatos = [];
  for (const actividad of actividades) {
    const vistas = new Set();
    const agregar = (url, origenFoto) => {
      if (!url || vistas.has(url)) return;
      vistas.add(url);
      candidatos.push({
        urlOriginal: url,
        origen: origenFoto,
        fuenteId: String(actividad.id),
        fechaEvento: actividad.fecha,
        categoria: actividad.categoria,
        proyectos: actividad.categoria === 'vinculacion' ? ['vinculacion'] : [],
        subidoPorId: actividad.registrador_id,
        menores: 'no',
        visibilidad: 'publicable',
        activo: true,
      });
    };
    for (const url of actividad.photos ?? []) agregar(url, actividad.tipo === 'podcast' ? 'podcast' : 'evento');
    if (actividad.evidencia_url) agregar(actividad.evidencia_url, actividad.tipo === 'podcast' ? 'podcast' : 'evento');
  }
  for (const asistencia of asistencias) {
    candidatos.push({
      urlOriginal: asistencia.foto_url,
      cloudinaryPublicId: asistencia.foto_public_id,
      origen: 'asistencia',
      fuenteId: String(asistencia.id),
      fechaEvento: asistencia.fecha,
      categoria: 'vinculacion',
      proyectos: ['vinculacion'], // ASUNCIÓN documentada: todos los espacios son area='vinculacion' (verificado 2026-09-26)
      subidoPorId: asistencia.registrado_por,
      // Decisión del usuario: las fotos de asistencia ya existentes van a la bandeja de revisión.
      menores: 'revisar',
      visibilidad: 'interna',
      activo: false,
    });
  }

  // 2. Archivos locales distintos (los de fotos existentes + los candidatos)
  const locales = new Set([
    ...fotosExistentes.map((foto) => foto.url).filter(esLocal),
    ...candidatos.map((c) => c.urlOriginal).filter(esLocal),
  ]);
  const reporte = { locales: locales.size, subidos: 0, reutilizados: 0, faltantes: [], demasiadoGrandes: [], fotosActualizadas: 0, insertadas: {}, omitidasPorDuplicado: 0 };
  const mapaCloudinary = new Map(); // urlLocal -> { url, publicId }

  for (const urlLocal of locales) {
    const absoluta = rutaAbsolutaDeLocal(urlLocal);
    if (!fs.existsSync(absoluta)) { reporte.faltantes.push(urlLocal); continue; }
    if (fs.statSync(absoluta).size > MAX_BYTES) { reporte.demasiadoGrandes.push(urlLocal); continue; }
    const publicId = publicIdDeLocal(urlLocal);
    if (!APLICAR) { mapaCloudinary.set(urlLocal, { url: `(simulado) ${publicId}`, publicId }); continue; }
    try {
      let recurso;
      try { recurso = await cloudinary.api.resource(publicId); reporte.reutilizados++; }
      catch { recurso = await cloudinary.uploader.upload(absoluta, { public_id: publicId, overwrite: false, resource_type: 'image' }); reporte.subidos++; }
      mapaCloudinary.set(urlLocal, { url: recurso.secure_url, publicId: recurso.public_id });
    } catch (error) {
      reporte.faltantes.push(`${urlLocal} (error Cloudinary: ${error.message})`);
    }
  }

  // 3. Actualizar url de las fotos existentes que eran locales (conservan ubicaciones, order, activo, posicion)
  for (const foto of fotosExistentes.filter((f) => esLocal(f.url))) {
    const nube = mapaCloudinary.get(foto.url);
    if (!nube) continue;
    reporte.fotosActualizadas++;
    if (APLICAR) await sql`UPDATE fotos SET url = ${nube.url}, cloudinary_public_id = ${nube.publicId}, updated = now() WHERE id = ${foto.id}`;
  }

  // 4. Insertar candidatos que no estén ya en el banco (por url original o por url de Cloudinary)
  for (const candidato of candidatos) {
    const nube = mapaCloudinary.get(candidato.urlOriginal);
    if (esLocal(candidato.urlOriginal) && !nube) continue; // archivo faltante: ya reportado
    const urlFinal = nube ? nube.url : candidato.urlOriginal;
    if (urlsEnBanco.has(candidato.urlOriginal) || urlsEnBanco.has(urlFinal)) { reporte.omitidasPorDuplicado++; continue; }
    reporte.insertadas[candidato.origen] = (reporte.insertadas[candidato.origen] ?? 0) + 1;
    urlsEnBanco.add(urlFinal);
    if (!APLICAR) continue;
    const id = `foto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await sql`
      INSERT INTO fotos (id, url, cloudinary_public_id, ubicaciones, "order", posicion, activo, origen, fuente_id, fecha_evento,
                         categoria, proyectos, subido_por_id, menores, visibilidad)
      VALUES (${id}, ${urlFinal}, ${nube ? nube.publicId : (candidato.cloudinaryPublicId ?? null)}, '{}', 0, 50, ${candidato.activo},
              ${candidato.origen}, ${candidato.fuenteId}, ${candidato.fechaEvento}, ${candidato.categoria}, ${candidato.proyectos},
              ${candidato.subidoPorId ?? null}, ${candidato.menores}, ${candidato.visibilidad})
      ON CONFLICT (origen, fuente_id, url) WHERE fuente_id IS NOT NULL DO NOTHING`;
  }

  // 5. Proyectos históricos de las actividades de Vinculación (solo si están vacíos)
  if (APLICAR) {
    await sql`UPDATE actividades_difusion SET proyectos = ARRAY['vinculacion'] WHERE categoria = 'vinculacion' AND cardinality(proyectos) = 0`;
  }

  // 6. Reporte
  console.log(JSON.stringify(reporte, null, 2));
  if (APLICAR) {
    const porOrigen = await sql`SELECT origen, menores, count(*)::int AS filas FROM fotos GROUP BY 1, 2 ORDER BY 1, 2`;
    const [{ ubicadas }] = await sql`SELECT count(*)::int AS ubicadas FROM fotos WHERE cardinality(ubicaciones) > 0`;
    console.log('fotos por origen/menores:', JSON.stringify(porOrigen));
    console.log('fotos con ubicación (debe coincidir con antes del backfill):', ubicadas);
  }
}

main().catch((error) => { console.error('ERROR:', error.message); process.exit(1); });
