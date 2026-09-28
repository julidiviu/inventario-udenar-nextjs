/** Archivo PNG listo para enviar al Blob Storage + preview para render inmediato. */
export interface FirmaPendiente {
  file: File;
  previewUrl: string;
  origen: "upload" | "canvas";
}

/** Convierte un Data URL image/png a File listo para Blob Storage. */
export async function dataUrlToPngFile(dataUrl: string, filename = "firma.png"): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/png" });
}

/** Lee un File .png como Data URL para preview inmediato. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export async function pngFileToFirmaPendiente(
  file: File,
  origen: FirmaPendiente["origen"],
): Promise<FirmaPendiente> {
  const previewUrl = await fileToDataUrl(file);
  return { file, previewUrl, origen };
}
