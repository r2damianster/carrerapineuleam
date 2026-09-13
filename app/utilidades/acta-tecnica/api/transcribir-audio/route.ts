import { NextRequest, NextResponse } from "next/server";
import { transcribirYExtraerPuntosActa, MAX_AUDIO_BYTES_ACTA, MAX_AUDIO_MB_ACTA } from "../../../_lib/actaAudio";
import { requireDocenteApi } from "../../../_lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await requireDocenteApi())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const audio = form.get("audio");

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "No se recibió ningún audio" }, { status: 400 });
    }
    if (!audio.type.startsWith("audio/") && !audio.type.startsWith("video/")) {
      // algunos navegadores marcan .m4a/.mp4 de audio como video/mp4
      return NextResponse.json({ error: "El archivo no es un audio válido" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES_ACTA) {
      const pesoMb = (audio.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `El programa solo permite audios de hasta ${MAX_AUDIO_MB_ACTA}MB. Este archivo pesa ${pesoMb}MB — súbelo comprimido o en una duración más corta.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const resultado = await transcribirYExtraerPuntosActa(buffer, audio.type, audio.name);

    return NextResponse.json({ success: true, data: resultado });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
