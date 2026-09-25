import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { neon } from "@neondatabase/serverless";
import { getAppSessionFromCookies } from '@/lib/session';

// Configurar Cloudinary usando las variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    const formData = await request.formData();

    // Sin sesión solo se admite la foto de un evento de un enlace temporal de difusión vigente
    // (/vinculacion/publico-difusion/[token]): el externo no tiene cuenta pero el profesor que
    // generó el enlace ya lo vetó. Cualquier otro caso sin sesión → 401.
    if (!usuario) {
      const enlaceToken = formData.get("enlace_token");
      let enlaceVigente = false;
      if (typeof enlaceToken === "string" && /^[0-9a-f-]{36}$/i.test(enlaceToken)) {
        const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
        const filas = await sql`
          SELECT 1 FROM enlaces_difusion
          WHERE token = ${enlaceToken} AND activo = true AND expira_en > now()
            AND (max_usos IS NULL OR usos_actuales < max_usos) AND tipo_contenido = 'evento'
        `;
        enlaceVigente = filas.length > 0;
      }
      if (!enlaceVigente) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    const isImageMime = file.type && file.type.startsWith('image/');
    const isImageExt = file.name && /\.(heic|heif|jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name);
    if (!isImageMime && !isImageExt) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "El archivo supera el límite de 15MB" }, { status: 400 });
    }

    // Convertir el archivo a un buffer y luego a base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'image/jpeg';
    const fileBase64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

    // Subir a Cloudinary — forzamos JPG (ej. fotos .heic de iPhone no las
    // renderiza casi ningún navegador si se guardan en su formato original).
    const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
      folder: "pine_project_uploads", // Carpeta en Cloudinary
      format: "jpg",
    });

    // Devolver la URL segura y el public_id (necesario para poder borrar
    // el asset de Cloudinary después, ej. desde el banco de fotos)
    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error subiendo el archivo", details: error.message },
      { status: 500 }
    );
  }
}
