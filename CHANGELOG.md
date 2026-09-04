# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

*(nada pendiente al día de la última entrada — ver `CLAUDE.md` para tareas abiertas de módulos específicos, ej. artículos científicos de Investigación)*

---

> ⚠️ **El proyecto abandonó PocketBase por completo** (retirado junto con la carpeta `pocketbase/` en la Sesión 8, 2026-04-26) a favor de **Neon Postgres** (SQL crudo vía `@neondatabase/serverless`), igual para el sitio público que para el Portal PINE. La lista de TODOs de PocketBase que vivía en esta sección quedó sin efecto — nunca se ejecutó, el proyecto tomó otro rumbo arquitectónico. El historial detallado sesión por sesión (30 sesiones y contando) vive en [`CLAUDE.md`](./CLAUDE.md) → `## Cambios Recientes`; este changelog resume los hitos mayores.

## [0.10.6] - 2026-09-04 (Sesión 30)

### ✅ Added
- "Ocultar sin borrar" en las 5 tablas del admin de contenido (Noticias, Actividades, Publicaciones, Podcast, Miembros) — columna `activo` nueva en `publications`/`videos`/`members`; `publicar_noticias`/`publicar_actividades` (ya existían en Noticias/Actividades) ahora editables desde la UI en vez de fijas en `true`. Un clic en la tabla oculta/muestra sin borrar el registro.
- Badge "Destacado" (Noticias, Podcast) ahora clickeable directo desde la tabla, sin abrir el formulario de edición.
- Buscador de texto libre + selector de tamaño de página (10/25/50/100) integrados en `components/admin/DataTable.tsx` — heredado automáticamente por las 5 tablas del admin que lo usan.

### 🐛 Fixed
- Al ocultar una noticia/actividad, la fila también desaparecía de la lista del propio admin (el `GET` que alimenta esas páginas era el mismo que filtra el sitio público) — corregido con un parámetro `?all=true` de uso exclusivo del admin.

---

## [0.10.0] – [0.10.5] (2026-06 a 2026-09-02) — resumen de hitos

Rango largo de sesiones que llevó el proyecto de un sitio estático con panel admin en memoria a la plataforma actual. Puntos mayores (detalle sesión por sesión en `CLAUDE.md`):

- Migración completa del contenido del sitio público (miembros, publicaciones, podcast, noticias/actividades) de `lib/data.ts` estático a **Neon Postgres** — el panel `/admin` dejó de perder los cambios en cada redeploy.
- Construcción del **Portal PINE**: auth unificada con cookie firmada, roles y permisos por espacio, Vinculación (espacios, pasantes, beneficiarios, asistencia, Test MCER, encuestas, difusión), Investigación, Gestión de Carrera, Indicadores.
- **Enlaces/QR públicos sin login** para que un beneficiario tome su Test MCER o encuesta de satisfacción desde el celular (pretest con alta de datos, postest de un solo uso).
- **Contribuciones Académicas** — registro de producción académica de docentes (artículos, libros, capítulos, memorias de evento), vía Prisma (único módulo del repo que no usa SQL crudo).
- Módulo **`/utilidades`** — generación de documentos administrativos (Acta Técnica, Oficios, Convocatorias, PATs de Maestría, Pares Lectores) con redacción asistida por IA, con selector de docentes unificado sobre `usuarios`.
- **i18n ES/EN completo** en todo el sitio público, footer/equipo/hub contextuales por proyecto (antes un solo bloque genérico repetido en las 10 páginas).
- Encuesta de satisfacción ampliada (4 dimensiones + calificación por instructor) y opción "ya estoy registrado" en el pretest público para no duplicar beneficiarios.

---

## [0.3.1] - 2026-04-13 (Session 4 — Documentation & Multi-AI Setup)

### ✅ Added - CLAUDE.md
- Created project-level `CLAUDE.md` with full project context for Claude Code
- Includes tech stack, file structure, PocketBase schema, auth details, conventions
- Multi-AI compatibility section (Claude Code + Qwen Code)

### ✅ Updated - QWEN.md
- Updated to 2026-04-13 with latest git commit reference (d38b5d2)
- Added multi-AI section documenting Claude/Qwen compatibility
- Added `CLAUDE.md` reference to documentation checklist

### ✅ Updated - Documentation Sync
- `CLAUDE.md` and `QWEN.md` now mirror each other as AI context files
- `CHANGELOG.md` updated with Session 4 entry
- `README.md` updated with multi-AI assistant section
- Both AI tools can now pick up full project context on session start

### 📊 Git Status
- Commit: `d38b5d2 - docs: update documentation with complete status and pending tasks`
- Branch: main (up to date with origin/main)
- All changes to be committed and pushed

---

## [0.3.0] - 2026-04-12 (Session 3 - Admin Panel Complete + Git Push)

### ✅ Added - Admin Panel (11 pages)
- Full admin panel with sidebar navigation and layout
- Authentication system with middleware protection
- Login page with email/password and Suspense boundary
- Dashboard with statistics cards and quick actions
- CRUD for Members (create, read, update, delete)
- CRUD for Videos with YouTube URL parsing and auto embed_id
- CRUD for Video Categories with auto-slug generation
- CRUD for Publications with type selection (article, conference, book, other)
- CRUD for News with slug generation and featured flag
- CRUD for Activities with category selection
- Site Settings page with social media links and site info
- DataTable reusable component for all CRUD pages
- Admin layout with responsive sidebar navigation
- Logout functionality with cookie clearing
- Protected routes via middleware (only 2 authorized emails)

### ✅ Added - Security & Middleware
- `middleware.ts` - Route protection for /admin/*
- `lib/admin-auth.ts` - Admin authentication helpers
- Authorization whitelist (2 emails only)
- JWT token storage in cookies
- Suspense boundary for useSearchParams in login

### ✅ Added - Documentation
- `POCKETBASE_SETUP.md` - Complete guide for PocketBase setup
- `RESUMEN.md` - Executive summary of the project
- `setup-pocketbase.ps1` - PowerShell script for PocketBase download
- `.env.local.example` - Environment variables template
- Updated `QWEN.md` with detailed project status
- Updated `README.md` with complete documentation
- `.gitignore` configured for Next.js

### ✅ Technical Updates
- Build successful: 14 static pages generated
- First Load JS: 87.3 kB - 118 kB
- Middleware: 26.6 kB
- 63 files committed to GitHub
- Repository pushed to origin/main
- Commit: `7b26b55 - feat: initial project setup with landing page and admin panel`
- GitHub: https://github.com/r2damianster/carrerapineuleam.git

### 📊 Stats
- Total files in repo: 63
- Lines of code: ~11,900
- React components: 13
- Next.js pages: 14
- TypeScript interfaces: 8
- Admin CRUD pages: 7

---

## [0.2.0] - 2026-04-12 (Session 2 - Landing Page Complete)

### ✅ Added - Landing Page Components
- `Hero.tsx` - Hero section with animated background, logo, CTAs
- `About.tsx` - Project description with objectives and highlights
- `TeamSection.tsx` - Team cards with photos, roles, ORCID integration
- `VideoGallery.tsx` - Video gallery with category filtering
- `VideoCard.tsx` - Individual video card with YouTube embed
- `PublicationsSection.tsx` - Scientific publications display
- `NewsSection.tsx` - News cards with featured images
- `ActivityGallery.tsx` - Activity photo gallery with lightbox modal
- `Contact.tsx` - Contact section with social links and form

### ✅ Added - Core Components
- `Header.tsx` - Responsive navigation with sticky behavior
- `Footer.tsx` - Footer with social links and contact info
- `lib/pocketbase.ts` - PocketBase client with data fetching helpers
- `types/index.ts` - TypeScript interfaces for all data models

### ✅ Added - Configuration
- Next.js 14 with TypeScript and App Router
- TailwindCSS with custom ULEAM colors
- PostCSS configuration
- Image optimization setup
- Smooth scrolling in globals.css
- Line clamp utilities

### ✅ Assets
- Project logo: `LOGO_Proyectro.png`
- Team photos: `lider_arturo_rodriguez.jpg`, `colider_Jhonny_Villafuerte.jpg`
- Activity photos: `actividad_previa_podcast.jpeg`, `Actividad_Podcast.jpeg`
- Podcast logo: `LOGO_PRogramadePodcast.jpeg`

### ✅ Build Status
- Build successful with no errors
- Static pages generated: 4 (initial)
- First Load JS: ~117 kB

---

## [0.1.0] - 2026-04-12 (Session 1 - Initial Setup)

### ✅ Initial Project Setup
- Created project structure and folders
- Configured Next.js with TypeScript and TailwindCSS
- Defined PocketBase schema (8 collections)
- Created initial TypeScript types
- Built initial Header and Footer components
- Set up PocketBase client library
- Created `QWEN.md` and `CHANGELOG.md`
- Session interrupted due to internet issues

### 📋 Schema Defined
- members
- publications
- videos
- video_categories
- news
- activities
- site_settings
- users (built-in)

---

## Summary by Version

| Version | Date | Focus | Progress |
|---------|------|-------|----------|
| 0.1.0 | 2026-04-12 | Initial Setup (era PocketBase, prototipo) | 20% |
| 0.2.0 | 2026-04-12 | Landing Page (era PocketBase, prototipo) | 50% |
| 0.3.0 | 2026-04-12 | Admin Panel + Git (era PocketBase, prototipo) | 70% |
| 0.3.1 | 2026-04-13 | Docs + Multi-AI Setup (era PocketBase, prototipo) | 70% |
| 0.10.0 – 0.10.5 | 2026-06 a 2026-09-02 | Migración a Neon + Portal PINE + i18n completo | ~99% |
| 0.10.6 | 2026-09-04 | Admin: ocultar sin borrar + buscador/paginación | ~99% |

---

**Last Updated:** 2026-09-04 (Sesión 30)
**Current Version:** 0.10.6
**Detalle sesión por sesión:** ver [`CLAUDE.md`](./CLAUDE.md)
