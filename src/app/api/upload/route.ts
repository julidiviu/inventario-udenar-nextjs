import { NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob";

const FOLDERS = new Set([
  "dependencias",
  "usuarios",
  "usuarios/firmas",
  "recursos",
  "firmas",
  "contratos_prestamo",
  "contratos_solicitud",
]);

/**
 * POST /api/upload (multipart/form-data: file + folder + kind)
 * - Server recibe el File, lo sube a Vercel Blob y devuelve { url }.
 * - El cliente luego envía ese `url` a su API de negocio y Drizzle lo guarda como text.
 * - Para PDFs grandes a futuro: usar handleUpload directo cliente->Blob.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "");
    const kind = form.get("kind") === "pdf" ? "pdf" : "foto";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Falta el campo 'file'." },
        { status: 400 },
      );
    }
    if (!FOLDERS.has(folder)) {
      return NextResponse.json(
        { error: `Carpeta no permitida: ${folder}.` },
        { status: 400 },
      );
    }

    const { url } = await uploadToBlob(
      file,
      folder as Parameters<typeof uploadToBlob>[1],
      kind,
    );
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al subir.";
    const status = message.includes("Falta BLOB") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
