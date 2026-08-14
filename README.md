# 🎓 Proyecto Innovaciones Pedagógicas e Internacionalización - ULEAM

Landing page con panel de administración para el proyecto de investigación sobre innovaciones pedagógicas e internacionalización en la Universidad Laica Eloy Alfaro de Manabí (ULEAM).

**Versión:** 0.3.0  
**Estado:** ✅ Landing Page + Admin Panel Completos - Código en GitHub  
**Build:** ✅ Exitoso (14 páginas estáticas, sin errores)  
**Git:** ✅ Push a origin/main (commit 7b26b55)  
**Tech Stack:** Next.js 14 + TypeScript + TailwindCSS + PocketBase (pendiente)

**Repositorio:** https://github.com/r2damianster/carrerapineuleam.git

---

## 🌟 Características Implementadas

### ✅ Landing Page (Completada 100%)
- **Hero Section**: Logo animado, título, CTAs, background con pattern
- **About**: Descripción, objetivos y 4 highlights del proyecto
- **Team**: Miembros con fotos, roles, ORCID, emails
- **Videos**: Galería con filtros por categoría + YouTube embeds
- **Publicaciones**: Artículos científicos con tipos y links DOI
- **Noticias**: Últimas novedades con imágenes destacadas
- **Galería**: Fotos de actividades con lightbox modal
- **Contacto**: Info de contacto + redes sociales + formulario

### ✅ Admin Panel (Completado 100%)
- **Autenticación**: Solo 2 emails autorizados, middleware protection
- **Dashboard**: Estadísticas + acciones rápidas
- **CRUD Miembros**: Gestión completa del equipo (foto, rol, ORCID)
- **CRUD Videos**: Videos de YouTube con parsing automático de URLs
- **CRUD Categorías**: Organización de series con auto-slug
- **CRUD Publicaciones**: Papers científicos con tipos
- **CRUD Noticias**: Noticias con slug automático y destacados
- **CRUD Actividades**: Eventos y fotos por categoría
- **Configuración**: Redes sociales e info del sitio

### 🎨 Diseño y UX
- UI moderna y 100% responsive (mobile-first)
- Colores institucionales ULEAM: azul (#003366) + dorado (#FFD700)
- Animaciones y transiciones suaves
- Smooth scrolling entre secciones
- Dark mode ready
- Accessible (semantic HTML, ARIA labels)
- Image optimization con Next.js

---

## 📁 Estructura del Proyecto

```
proyecto-innovacion-e-internacionalizacion/
├── .gitignore
├── CHANGELOG.md                   # Historial de versiones
├── POCKETBASE_SETUP.md           # Guía completa de PocketBase
├── QWEN.md                        # Estado detallado del proyecto
├── README.md                      # Este archivo
├── RESUMEN.md                     # Resumen ejecutivo
├── setup-pocketbase.ps1          # Script automatización
├── Imágenes (6 fotos y logos)
├── Documentos Word (4 archivos)
└── frontend/                      # Next.js Application
    ├── .env.local.example        # Variables de entorno
    ├── package.json              # Dependencias
    ├── tsconfig.json             # TypeScript config
    ├── tailwind.config.ts        # Tailwind con colores ULEAM
    ├── postcss.config.cjs        # PostCSS config
    ├── next.config.js            # Next.js config
    ├── middleware.ts             # Route protection
    ├── app/
    │   ├── layout.tsx            # Root layout con metadata
    │   ├── page.tsx              # Landing page principal
    │   ├── globals.css           # Global styles + smooth scroll
    │   └── admin/                # Admin panel (11 páginas)
    │       ├── layout.tsx        # Admin layout con sidebar
    │       ├── page.tsx          # Redirect a dashboard
    │       ├── login/            # Login protegido
    │       ├── dashboard/        # Estadísticas
    │       ├── members/          # CRUD miembros
    │       ├── videos/           # CRUD videos
    │       ├── categories/       # CRUD categorías
    │       ├── publications/     # CRUD publicaciones
    │       ├── news/             # CRUD noticias
    │       ├── activities/       # CRUD actividades
    │       └── settings/         # Configuración sitio
    ├── components/               # React components (13 total)
    │   ├── Header.tsx            # Navegación sticky
    │   ├── Footer.tsx            # Footer completo
    │   ├── Hero.tsx              # Hero animado
    │   ├── About.tsx             # Sección about
    │   ├── TeamSection.tsx       # Equipo con fotos
    │   ├── VideoGallery.tsx      # Videos con filtros
    │   ├── VideoCard.tsx         # Card con YouTube embed
    │   ├── PublicationsSection.tsx
    │   ├── NewsSection.tsx
    │   ├── ActivityGallery.tsx   # Galería con lightbox
    │   ├── Contact.tsx           # Contacto + redes
    │   └── admin/DataTable.tsx   # Tabla CRUD reutilizable
    ├── lib/                      # Libraries
    │   ├── pocketbase.ts         # Cliente PocketBase
    │   └── admin-auth.ts         # Auth helpers
    ├── types/index.ts            # 8 Interfaces TypeScript
    └── public/images/            # 6 imágenes estáticas
```

---

## 🚀 Cómo Empezar

### Prerrequisitos
- Node.js 18+
- npm o yarn
- PocketBase (para funcionalidad completa del admin)

### Instalación Rápida

```bash
# Clonar repositorio
git clone https://github.com/r2damianster/proyecto-innovacion-e-internacionalizacion.git
cd proyecto-innovacion-e-internacionalizacion

# Instalar dependencias
cd frontend
npm install

# Configurar variables
copy .env.local.example .env.local

# Iniciar en desarrollo
npm run dev
```

### Acceder a la Aplicación

- **Landing Page:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/login

### Build Producción

```bash
npm run build
npm run start
```

---

## 📊 Progreso del Proyecto

| Módulo | Estado | % |
|--------|--------|---|
| Landing Page | ✅ Completo | 100% |
| Admin Panel | ✅ Completo | 100% |
| TypeScript Types | ✅ Completo | 100% |
| Middleware/Auth | ✅ Completo | 100% |
| Documentación | ✅ Completa | 100% |
| Git + GitHub | ✅ Completo | 100% |
| PocketBase Backend | ⏳ Pendiente | 0% |
| Contenido Real | ⏳ Pendiente | 0% |
| Deploy | ⏳ Pendiente | 0% |

**Progreso Total: ~70%**

---

## 🗺️ Próximos Pasos

### Sesión 4: PocketBase Backend (1-2 horas)
1. Descargar PocketBase desde https://pocketbase.io
2. Ejecutar servidor local
3. Crear 8 colecciones según schema
4. Configurar API rules
5. Crear usuarios admin
6. Probar login y CRUD

**Guía detallada:** Ver `POCKETBASE_SETUP.md`

### Sesión 5: Contenido Real (2-3 horas)
1. Extraer info de Word documents
2. Crear categorías de video
3. Agregar miembros, videos, publicaciones

### Sesión 6: Testing y Deploy (2-3 horas)
1. Testing completo
2. Deploy a Vercel + PocketBase Cloud
3. Configuración final

---

## 👥 Equipo del Proyecto

- **Líder**: Arturo Rodríguez - arturo.rodriguez@uleam.edu.ec
- **Colíder**: Jhonny Villafuerte - jhonny.villafuerte@uleam.edu.ec

---

## 🔐 Acceso Admin

**Emails autorizados (solo 2):**
- arturo.rodriguez@uleam.edu.ec
- jhonny.villafuerte@uleam.edu.ec

**Password:** `Pine2026`

*(Estos usuarios deben existir en la colección `users` de PocketBase)*

---

## 📚 Documentación

| Archivo | Descripción |
|---------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Contexto completo para Claude Code |
| [QWEN.md](./QWEN.md) | Contexto completo para Qwen Code |
| [CHANGELOG.md](./CHANGELOG.md) | Historial de versiones |
| [POCKETBASE_SETUP.md](./POCKETBASE_SETUP.md) | Guía paso a paso de PocketBase |
| [RESUMEN.md](./RESUMEN.md) | Resumen ejecutivo del proyecto |
| [README.md](./README.md) | Este archivo |

---

## 🤖 Asistentes IA Compatibles

Este proyecto está configurado para trabajar con múltiples asistentes IA:

| Asistente | Archivo de contexto | Cómo iniciar |
|-----------|--------------------|----|
| **Claude Code** | `CLAUDE.md` | `claude` en la terminal del proyecto |
| **Qwen Code** | `QWEN.md` | Qwen carga este archivo automáticamente |

Ambos archivos contienen el mismo contexto del proyecto y deben mantenerse sincronizados.
Al iniciar sesión con cualquier IA, lee primero el archivo correspondiente para retomar el trabajo exactamente donde quedó.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript estricto
- **Estilos**: TailwindCSS personalizado
- **Componentes**: React 18 con Server Components
- **Auth**: PocketBase Auth + Middleware
- **Images**: Next.js Image optimization

### Backend (Pendiente)
- **Database**: PocketBase (SQLite embedded)
- **Auth**: Email/Password
- **Storage**: File uploads
- **API**: REST auto-generada

### Deploy (Planificado)
- **Frontend**: Vercel
- **Backend**: PocketBase Cloud o VPS
- **CI/CD**: GitHub Actions (auto-deploy)

---

## 📦 Stats del Build (v0.3.0)

```
Route (app)                              Size     First Load JS
┌ ○ /                                    12.4 kB         118 kB
├ ○ /_not-found                          873 B          88.2 kB
├ ○ /admin                               136 B          87.5 kB
├ ○ /admin/activities                    2.17 kB        99.3 kB
├ ○ /admin/categories                    2.44 kB        99.6 kB
├ ○ /admin/dashboard                     1.6 kB          107 kB
├ ○ /admin/login                         1.8 kB         98.9 kB
├ ○ /admin/members                       2.43 kB        99.6 kB
├ ○ /admin/news                          2.34 kB        99.5 kB    
├ ○ /admin/publications                  2.38 kB        99.5 kB    
├ ○ /admin/settings                      1.58 kB        88.9 kB    
└ ○ /admin/videos                        2.91 kB         100 kB    

+ First Load JS shared by all            87.3 kB
ƒ Middleware                             26.6 kB

✓ Compiled successfully
✓ 14 static pages generated
✓ No errors
```

---

## 🔗 Links Importantes

- **Repositorio GitHub**: https://github.com/r2damianster/proyecto-innovacion-e-internacionalizacion.git
- **ULEAM**: https://www.uleam.edu.ec
- **PocketBase**: https://pocketbase.io
- **Next.js**: https://nextjs.org
- **TailwindCSS**: https://tailwindcss.com

---

## 🆘 Soporte

Para preguntas o problemas técnicos:
- Revisa `QWEN.md` para el estado y tareas pendientes
- Revisa `POCKETBASE_SETUP.md` para configuración de backend
- Revisa `CHANGELOG.md` para el historial de cambios

---

**Última actualización:** Abril 13, 2026  
**Versión:** 0.3.1  
**Estado:** ✅ Landing + Admin Listos — Falta PocketBase y contenido real  
**Git:** ✅ Push completado a origin/main  
**Próxima sesión:** Instalar PocketBase y crear colecciones
