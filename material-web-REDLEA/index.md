# RED LEA - Índice de contenidos

Estructura de navegación sugerida para la web.

## Documentos principales

### 1. [Qué es la RED LEA](./que-es-red-lea.md)
- **Descripción**: Información sobre la RED LEA
- **Imágenes**: 2 (en `assets/01-red-lea/`)
- **Párrafos**: 25
- **Propósito**: Página de presentación/about

### 2. [Logos RED LEA](./logos-red-lea.md)
- **Descripción**: Logos institucionales
- **Imágenes**: 2 (en `assets/02-logos/`)
- **Párrafos**: 6
- **Propósito**: Branding/assets

### 3. [Testimonios](./testimonios.md)
- **Descripción**: Testimonios de participantes
- **Imágenes**: 6 (en `assets/03-testimonios/`)
- **Párrafos**: 73
- **Propósito**: Social proof, historias de impacto

### 4. [Galería Fotográfica](./galeria-fotografica.md)
- **Descripción**: Galería de eventos
- **Imágenes**: 15 (en `assets/04-galeria/`)
- **Párrafos**: 46
- **Propósito**: Portafolio visual

### 5. [Memoria Primer Encuentro](./memoria-encuentro.md)
- **Descripción**: Reporte completo del primer encuentro
- **Imágenes**: 12 (en `assets/05-memoria/`)
- **Párrafos**: 367
- **Tablas**: 2
- **Propósito**: Documentación, registro histórico

---

## Sugerencias de layout web

### Estructura posible:
```
/
├── index.html (inicio)
├── sobre-red-lea/ → que-es-red-lea.md
├── logos/        → logos-red-lea.md
├── testimonios/  → testimonios.md
├── galeria/      → galeria-fotografica.md
├── memoria/      → memoria-encuentro.md
└── assets/       → [todos los archivos]
```

### Flujo de usuario:
1. **Inicio** → Presentación de RED LEA
2. **Sobre** → Detalles de la RED
3. **Galería** → Imágenes de eventos
4. **Testimonios** → Impacto/historias
5. **Documentos** → Reportes formales

---

## Notas para desarrollo

- Todas las referencias de imágenes usarán rutas relativas: `./assets/NN-slug/NN-imagen.ext`
- Los MD están listos para procesar con `markdown-it` o similar
- Tablas están en formato Markdown estándar
- Encoding: UTF-8 en todos los archivos

---

*Propuesta de estructura para web. Ajustar según diseño final.*
