/** Perfil del usuario autenticado (proyección de `users` en Drizzle). */
export interface PerfilUsuario {
  nombre: string;
  codigo: string;
  rol: string;
  rolLabel: string;
  programa: string;
  email: string | null;
  fotoUrl: string | null;
  cedula: string | null;
  telefono: string | null;
  /** URL pública del PNG en Blob Storage. */
  firmaUrl: string | null;
}

/**
 * Drizzle Studio puede dejar "" en vez de NULL: normaliza a null para que
 * la UI y las reglas de "campo faltante" lo traten como ausente.
 */
export function emptyToNull(value: string | null | undefined): string | null {
  return value ? value : null;
}
