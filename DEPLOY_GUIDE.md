# 🚀 Guía Completa de Deploy - Railway + Vercel

## Arquitectura Final

```
Frontend (Vercel - Gratis)
    ↓ apunta a
PocketBase (Railway - Gratis con créditos)
    ↓ editas desde
Panel Admin (desde tu navegador)
```

---

## PARTE 1: Deploy de PocketBase en Railway

### Paso 1: Crear cuenta en Railway

1. Ve a https://railway.app/
2. Click en **"Start a New Project"**
3. Se registra con **GitHub** (recomendado)
4. Te pedirán tarjeta de crédito para verificación, pero no te cobrarán si no excedes los créditos gratuitos

### Paso 2: Crear proyecto PocketBase

1. Click en **"New Project"**
2. Selecciona **"Deploy PocketBase"** (aparece en el catálogo de templates)
3. Railway te mostrará la configuración automática:
   - **Image:** `ghcr.io/mostafahub/pocketbase-railway:latest`
   - **Variable PB_PUBLIC_URL:** Déjala vacía por ahora
   - **Variable PB_ADMIN_EMAIL:** `arturo.rodriguez@uleam.edu.ec`
   - **Variable PB_ADMIN_PASSWORD:** `Pine2026`

4. Click en **"Deploy"**

### Paso 3: Configurar PocketBase

Railway iniciará el deploy. Espera 2-3 minutos a que esté listo.

1. Cuando termine, ve a la pestaña **"Settings"**
2. Busca la sección **"Domains"**
3. Click en **"Generate Domain"**
4. Copia la URL generada (ejemplo: `https://proyecto-innovacion-production.up.railway.app`)

### Paso 4: Crear colecciones en PocketBase

1. Abre tu URL de PocketBase en el navegador:
   ```
   https://TU-URL.up.railway.app/_/
   ```

2. Inicia sesión con:
   - **Email:** `arturo.rodriguez@uleam.edu.ec`
   - **Password:** `Pine2026`

3. **Crea las 8 colecciones** según la guía en `POCKETBASE_SETUP.md`:
   - members
   - publications
   - videos
   - video_categories
   - news
   - activities
   - site_settings

   O usa la función **"Import"** si PocketBase lo permite para crearlas más rápido.

### Paso 5: Configurar API Rules

Para CADA colección, ve a **Settings** → **API Rules** y configura:

- **List rule:** `true`
- **View rule:** `true`
- **Create rule:** `@request.auth.id != ""`
- **Update rule:** `@request.auth.id != ""`
- **Delete rule:** `@request.auth.id != ""`

### Paso 6: Crear usuarios admin

Ve a la colección **users** (built-in) y crea:

**Usuario 1:**
- email: `arturo.rodriguez@uleam.edu.ec`
- password: `Pine2026`
- role: `admin`

**Usuario 2:**
- email: `jhonny.villafuerte@uleam.edu.ec`
- password: `Pine2026`
- role: `admin`

### Paso 7: Probar la API

Abre en tu navegador:
```
https://TU-URL.up.railway.app/api/health
```

Deberías ver:
```json
{
  "code": 200,
  "message": "PocketBase server is running",
  "data": {}
}
```

✅ **¡PocketBase en Railway está listo!**

---

## PARTE 2: Deploy del Frontend en Vercel

### Paso 1: Configurar variable de entorno en Vercel

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto: `proyecto-innovacion-e-internacionalizacion`
3. Ve a **Settings** → **Environment Variables**
4. Agrega una nueva variable:
   - **Name:** `NEXT_PUBLIC_POCKETBASE_URL`
   - **Value:** `https://TU-URL.up.railway.app` (la URL que copiaste de Railway)
   - **Environment:** Production ✅ (marca todos)
   - Click **Save**

### Paso 2: Actualizar el repositorio

El archivo `vercel.json` ya está configurado y pusheado a GitHub. Solo necesitas hacer un nuevo deploy.

### Paso 3: Trigger de nuevo deploy en Vercel

**Opción A - Automática:**
- Vercel detectará el nuevo commit que ya hiciste con `vercel.json`
- Espera 2-3 minutos

**Opción B - Manual:**
1. Ve al dashboard de Vercel
2. Click en **"Redeploy"** en el último deployment
3. Espera a que termine el build

### Paso 4: Verificar el deploy

1. Abre tu URL de Vercel:
   ```
   https://carrerapineuleam.vercel.app
   ```

2. Deberías ver la landing page funcionando con datos de PocketBase

3. Prueba el admin:
   ```
   https://carrerapineuleam.vercel.app/admin/login
   ```

4. Inicia sesión con:
   - Email: `arturo.rodriguez@uleam.edu.ec`
   - Password: `Pine2026`

✅ **¡Frontend en Vercel está listo!**

---

## PARTE 3: Agregar contenido inicial

### Desde el Panel Admin (recomendado)

1. Ve a `https://TU-URL.vercel.app/admin`
2. Inicia sesión
3. Agrega el contenido desde cada sección:
   - Miembros del equipo
   - Categorías de video
   - Videos de YouTube
   - Publicaciones
   - Noticias
   - Actividades

### Desde PocketBase directamente (alternativa)

1. Ve a `https://TU-URL.up.railway.app/_/`
2. Inicia sesión
3. Agrega contenido directamente en cada colección

---

## PARTE 4: Flujo de trabajo diario

### Para editar contenido:

**Opción 1 - Desde tu panel admin:**
1. Ve a `https://TU-URL.vercel.app/admin`
2. Inicia sesión
3. Edita lo que necesites
4. Los cambios se guardan automáticamente en PocketBase (Railway)
5. Se reflejan instantáneamente en el frontend

**Opción 2 - Desde PocketBase:**
1. Ve a `https://TU-URL.up.railway.app/_/`
2. Inicia sesión
3. Edita directamente en las colecciones
4. Los cambios son inmediatos

### Para actualizar el frontend:

1. Haz cambios en tu código
2. `git add .`
3. `git commit -m "mensaje"`
4. `git push`
5. Vercel hace deploy automático en 2-3 minutos

---

## Costos estimados

| Servicio | Plan | Costo mensual |
|----------|------|---------------|
| Vercel | Hobby | **$0** |
| Railway | Developer (con créditos gratis) | **$0** (usarás ~$2-3 de los $5 gratis) |
| **TOTAL** | | **$0/mes** 🎉 |

---

## URLs que tendrás

- **Frontend público:** `https://carrerapineuleam.vercel.app`
- **Admin panel:** `https://carrerapineuleam.vercel.app/admin`
- **PocketBase:** `https://carrerapineuleam-production.up.railway.app`
- **PocketBase admin:** `https://carrerapineuleam-production.up.railway.app/_/`

---

## Troubleshooting

### Error: "No se puede conectar a PocketBase"
1. Verifica que `NEXT_PUBLIC_POCKETBASE_URL` esté configurada en Vercel
2. Verifica que PocketBase esté corriendo en Railway (revisa los logs)
3. La URL debe ser exacta, sin `/` al final

### Error: "Collection not found"
1. Asegúrate de haber creado todas las colecciones en PocketBase
2. Los nombres deben ser exactos (en minúsculas, con guiones bajos)

### Error: "Unauthorized"
1. Verifica que el usuario exista en la colección `users`
2. Solo los 2 emails autorizados pueden acceder
3. El password debe ser exacto: `Pine2026`

### Railway dice "No credits left"
1. Railway da $5 gratis al mes
2. PocketBase usa ~$2-3/mes
3. Si necesitas más, puedes agregar $5 manualmente
4. O espera al siguiente mes cuando se renuevan los créditos

---

## Resumen de pasos

- [ ] 1. Crear cuenta en Railway
- [ ] 2. Deploy de PocketBase en Railway
- [ ] 3. Configurar dominio en Railway
- [ ] 4. Crear 8 colecciones en PocketBase
- [ ] 5. Configurar API Rules
- [ ] 6. Crear usuarios admin
- [ ] 7. Configurar `NEXT_PUBLIC_POCKETBASE_URL` en Vercel
- [ ] 8. Verificar deploy en Vercel
- [ ] 9. Probar login en admin panel
- [ ] 10. Agregar contenido inicial

---

**¡Listo! Tu proyecto estará en producción con base de datos editable desde cualquier lugar.** 🚀
