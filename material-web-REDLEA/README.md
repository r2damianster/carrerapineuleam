# Material Web - RED LEA

Paquete preparado para convertir a página web desde Markdown + imágenes extraídas.

## Estructura

```
material-web/
├── README.md                    # Este archivo
├── que-es-red-lea.md           # Contenido: Qué es la RED LEA
├── logos-red-lea.md            # Contenido: Logos RED LEA y ULEAM
├── testimonios.md              # Contenido: Testimonios
├── galeria-fotografica.md      # Contenido: Galería Fotográfica
├── memoria-encuentro.md        # Contenido: Memoria Primer Encuentro
│
└── assets/
    ├── 01-red-lea/             # Imágenes de "Qué es la RED LEA"
    │   ├── 01-imagen.png
    │   └── ...
    ├── 02-logos/               # Imágenes de "Logos"
    │   ├── 01-imagen.png
    │   └── ...
    ├── 03-testimonios/         # Imágenes de "Testimonios"
    │   ├── 01-imagen.jpeg
    │   └── ...
    ├── 04-galeria/             # Imágenes de "Galería Fotográfica"
    │   ├── 01-imagen.jpeg
    │   └── ...
    └── 05-memoria/             # Imágenes de "Memoria Encuentro"
        ├── 01-imagen.png
        └── ...
```

## Información de extracción

| Documento | Párrafos | Imágenes | Bloques | Tamaño |
|-----------|----------|----------|--------|--------|
| Qué es RED LEA | 25 | 2 | 21 | 3.5 KB |
| Logos RED LEA | 6 | 2 | 1 | 0.9 KB |
| Testimonios | 73 | 6 | 34 | 11 KB |
| Galería Fotográfica | 46 | 15 | 7 | 0.7 KB |
| Memoria Encuentro | 367 | 12 | 292 | 32.5 KB |
| **TOTAL** | **517** | **37** | **355** | **~48.6 KB** |

## Uso

### 0. Insertar referencias a imágenes (IMPORTANTE)

Los archivos MD NO contienen referencias markdown a imágenes. Debes insertarlas manualmente:

**Formato:**
```markdown
![Descripción de la imagen](./assets/NN-slug/NN-imagen.ext)
```

**Ejemplo para testimonios.md:**
```markdown
## Testimonio 1

Contenido del testimonio...

![Testimonio 1](./assets/03-testimonios/01-imagen.jpeg)

## Testimonio 2

Más contenido...

![Testimonio 2](./assets/03-testimonios/02-imagen.jpeg)
```

**Herramientas para hacerlo:**
- Editor manual: VS Code + busca/reemplaza
- Script Python: procesar MD + insertar referencias automáticamente (ver `insert_images.py` si lo creas)
- En desarrollo web: cargar dinámicamente imágenes basadas en carpetas

### 1. Revisar contenido Markdown

Cada `.md` contiene el contenido extraído del Word correspondiente:

```bash
cat que-es-red-lea.md
cat testimonios.md
```

### 2. Referencias a imágenes

Las imágenes están en **rutas relativas** por documento. Para actualizar las referencias en los MD:

- `que-es-red-lea.md` → `./assets/01-red-lea/01-imagen.png`
- `logos-red-lea.md` → `./assets/02-logos/01-imagen.png`
- `testimonios.md` → `./assets/03-testimonios/01-imagen.jpeg`
- etc.

### 3. Convertir a web

Opciones:

#### A. Hugo / Static Site Generator
```bash
hugo new site web
# Copiar .md a content/
# Copiar assets/ a static/
```

#### B. React + Next.js
```bash
# Usar loader de MD (MDX, remark)
# Importar dinámicamente assets/
```

#### C. HTML puro + JavaScript
```bash
# Procesar .md con markdown-it
# Reemplazar refs `./assets/NN-slug/` dinámicamente
```

## Notas de extracción

✓ **Verificado**: Cada archivo se leyó completamente antes de convertir
✓ **Imágenes**: Extraídas y renombradas sistemáticamente (01-imagen, 02-imagen, ...)
✓ **Encoding**: UTF-8 en todos los MD
✓ **Tablas**: Convertidas a formato Markdown (`|` delimitadas)
⚠️ **Formato**: Texto simple; estilos originales del Word se perdieron

### Sobre las imágenes

- **Extraídas**: 37 imágenes en 4 carpetas (01-red-lea no tiene imágenes)
- **Mapeo manual requerido**: Los MD actuales NO contienen referencias markdown a imágenes
- **Razón**: Las imágenes en los Word estaban embebidas de forma que no se puede mapear automáticamente a posiciones de texto
- **Próximo paso**: Ver sección "Insertar referencias a imágenes" abajo

## Pasos siguientes

1. **Editar MD**: Ajustar títulos, formateo, añadir enlaces internos
2. **Actualizar refs de imágenes**: Buscar y reemplazar rutas relativas
3. **Crear layout web**: Estructura HTML/CSS desde este contenido
4. **Deploy**: Subir a GitHub Pages, Vercel, o servidor

## Archivos fuente originales

Extraídos desde:
- `WEB Qué es la RED LEA.docx`
- `web LOGOS RED LEA Y ULEAM.docx`
- `WEB Testimonios_.docx`
- `web Galería fotográfica.docx`
- `web MEMORIA PRIMER ENCUENTRO RED LEA.docx`

---

*Paquete generado automáticamente. Estructura lista para web.*
