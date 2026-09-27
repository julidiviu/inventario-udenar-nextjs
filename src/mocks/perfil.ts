/**
 * Mock data UI-first para la vista "Mi Perfil".
 * Espejo de `users` en Drizzle (codigo/cedula/programa/telefono/fotoUrl/firmaUrl).
 * No toca la base de datos. La arquitectura final subirá el PNG de la firma
 * a Blob Storage y guardará la URL pública en Postgres con Drizzle.
 */

export type PerfilRol = "profesor" | "estudiante" | "admin" | "superadmin";

export interface PerfilUsuario {
  nombre: string;
  codigo: string;
  rol: PerfilRol;
  rolLabel: string;
  programa: string;
  fotoUrl: string | null;
  cedula: string | null;
  telefono: string | null;
  /** Data URL image/png (preview) o URL pública del Blob en producción. */
  firmaUrl: string | null;
}

/** Archivo PNG listo para enviar al Blob Storage + preview para render inmediato. */
export interface FirmaPendiente {
  file: File;
  previewUrl: string;
  origen: "upload" | "canvas";
}

export type EstadoPerfil = "incompleto" | "completo";

export function getEstadoPerfil(
  u: Pick<PerfilUsuario, "cedula" | "telefono" | "firmaUrl">,
): EstadoPerfil {
  return u.cedula && u.telefono && u.firmaUrl ? "completo" : "incompleto";
}

export const mockPerfilIncompleto: PerfilUsuario = {
  nombre: "Andrea Eraso",
  codigo: "220034120",
  rol: "profesor",
  rolLabel: "Profesor",
  programa: "Ingeniería de Sistemas",
  fotoUrl: null,
  cedula: null,
  telefono: null,
  firmaUrl: null,
};

export const mockPerfilCompleto: PerfilUsuario = {
  nombre: "Andrea Eraso",
  codigo: "220034120",
  rol: "profesor",
  rolLabel: "Profesor",
  programa: "Ingeniería de Sistemas",
  fotoUrl: null,
  cedula: "1080123456",
  telefono: "3001234567",
  // Placeholder solo para probar el modo lectura. En producción será
  // una URL pública image/png proveniente de Blob Storage.
  firmaUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120"><rect width="100%" height="100%" fill="white"/><text x="50%" y="58%" text-anchor="middle" font-family="cursive" font-size="34" fill="black">Andrea Eraso</text></svg>`,
    ),
};
