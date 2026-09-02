---
name: estandar-archivos
description: Estandariza el nombre de cualquier archivo nuevo (PDF, imagen) antes de copiarlo a public/images, public/files o public/admin-assets en este proyecto. Úsalo siempre que el usuario agregue documentos o fotos a la carpeta raíz para subir al sitio (certificados, informes, fotos de actividades, publicaciones).
---

# Estándar de nombres de archivo — carreraPINE

Este proyecto exige un formato único de nombre para todo archivo nuevo subido a `public/images/`, `public/files/` o `public/admin-assets/`. Aplica tanto si trabaja Claude Code como Antigravity — es la misma regla en ambos, documentada también en `CLAUDE.md` y `ANTIGRAVITY.md`.

## Formato obligatorio

```
YYYY-MM-DD_DescripcionCorta[-signed].ext
```

- **`YYYY-MM-DD`**: fecha del documento o evento real (la fecha del certificado, del informe, del día de la actividad) — **nunca** la fecha en que se está subiendo el archivo. Si el documento cubre un rango de fechas (ej. capacitación del 4 al 13 de agosto), usar la fecha de cierre/emisión.
- **`DescripcionCorta`**: palabras en PascalCase o separadas por guion, sin espacios, sin tildes/ñ, sin mayúsculas sostenidas, sin caracteres especiales. Debe describir el contenido, no el proceso ("CertificadosCapacitacionAsierRomero", no "documento1" ni "escaneo".
- **`-signed`**: agregar solo si el PDF está firmado digitalmente (coincide con la convención ya usada en el repo).
- **Extensión en minúsculas**: `.pdf`, `.jpeg`, `.png` (no `.PDF`/`.JPG`).

Ejemplos correctos:
- `2026-08-13_CertificadosCapacitacionAsierRomero-FET-signed.pdf`
- `2026-08-13_Capacitacion-AsierRomero-Auditorio.jpeg`
- `2026-04-28_FomentoEscrituraCreativa.pdf`

Ejemplos a evitar (estilo legacy, no replicar): `2026_FICHA_PRESUPUESTARIA.pdf` (sin día), `Informe_sOCIALZACIÓN_dISNEY-signed.pdf` (mayúsculas sostenidas + tilde), `WhatsApp Image 2026-08-31 at 13.29.45 (1).jpeg` (espacios, sin descripción).

## Cuándo aplicar

Cada vez que:
1. El usuario deja un archivo nuevo en la raíz del repo (o cualquier carpeta fuera de `public/`) pidiendo subirlo al sitio o al panel admin.
2. Se va a insertar una fila nueva en `publications`, `actividades_difusion`, `members`, o agregar una entrada en `app/admin/documents/page.tsx` que referencie un archivo físico.

## Procedimiento

1. Determinar la fecha real del documento (leer el PDF/certificado si hace falta — no asumir).
2. Determinar la carpeta destino correcta según la regla de "Gestión de Archivos" de `CLAUDE.md`:
   - `public/images/` → fotos públicas (equipo, actividades, noticias).
   - `public/files/` → PDFs públicos descargables (publicaciones científicas, libros).
   - `public/admin-assets/` → documentos internos/confidenciales (actas, presupuestos, certificados internos).
3. Copiar/mover el archivo con el nombre ya en el formato estándar (no renombrar después de referenciarlo en código o Neon).
4. Referenciar ese nombre exacto en el código (`app/admin/documents/page.tsx`, scripts de seed) o en la fila de Neon (`photos[]`, `pdf_file`).
5. Borrar el archivo original de la raíz una vez copiado, para no dejar duplicados sueltos.

## Archivos legacy (no tocar sin pedir)

Los archivos subidos antes de la Sesión 26 (2026-09-02) no siguen este estándar. **No renombrarlos de forma proactiva** — muchos están referenciados por nombre exacto en `app/admin/documents/page.tsx` y algunos PDFs de `public/files/` pueden estar enlazados desde la columna `publications.pdf_file` en Neon. Si el usuario pide limpiar/renombrar el legacy, es una tarea aparte: hay que actualizar cada referencia en el mismo cambio, no solo el archivo.
