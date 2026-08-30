import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getUserSessionFromCookies } from '@/lib/userSession';

// Configurar Cloudinary usando las variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const usuario = await getUserSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "El archivo supera el límite de 8MB" }, { status: 400 });
    }

    // Convertir el archivo a un buffer y luego a base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileBase64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Subir a Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
      folder: "pine_project_uploads", // Carpeta en Cloudinary
    });

    // Devolver la URL segura que nos da Cloudinary
    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error subiendo el archivo", details: error.message },
      { status: 500 }
    );
  }
}
