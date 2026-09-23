import { del, put } from "@vercel/blob";

const MAX_FOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

const FOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PDF_TYPES = new Set(["application/pdf"]);

type BlobFolder =
  | "dependencias"
  | "usuarios"
  | "usuarios/firmas"
  | "recursos"
  | "firmas"
  | "contratos_prestamo"
  | "contratos_solicitud";

function assertEnv() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Falta BLOB_READ_WRITE_TOKEN en .env.local (Vercel Storage -> Create Store).",
    );
  }
}

function validate(file: File, kind: "foto" | "pdf") {
  const max = kind === "foto" ? MAX_FOTO_BYTES : MAX_PDF_BYTES;
  if (file.size > max) {
    throw new Error(
      `Archivo ${file.name} supera el máximo de ${max / 1024 / 1024} MB.`,
    );
  }
  if (kind === "foto" && !FOTO_TYPES.has(file.type)) {
    throw new Error(`Tipo no permitido para foto: ${file.type}. Usa PNG/JPG/WebP.`);
  }
  if (kind === "pdf" && !PDF_TYPES.has(file.type)) {
    throw new Error(`Tipo no permitido para contrato: ${file.type}. Usa PDF.`);
  }
}

/**
 * Sube un archivo a Vercel Blob y retorna la URL pública.
 * Llamar SOLO desde Route Handlers / Server Actions (tiene el token).
 * En la DB (Drizzle) se guarda únicamente el `url` retornado (text).
 */
export async function uploadToBlob(
  file: File,
  folder: BlobFolder,
  kind: "foto" | "pdf" = "foto",
): Promise<{ url: string }> {
  assertEnv();
  validate(file, kind);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `${folder}/${Date.now()}-${safeName}`;
  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || undefined,
    addRandomSuffix: true,
  });
  return { url: blob.url };
}

export async function deleteFromBlob(url: string) {
  assertEnv();
  await del(url);
}
