// Espejo de la tabla `dependencias` (src/db/schema/auth.ts). Sin campos extra.
export interface Dependencia {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  administradorId: string | null;
}

// Opción del select "Administrador": derivado de users (rol admin sin dependencia).
export interface AdminDisponible {
  id: string;
  codigo: string;
  nombreCompleto: string;
}

export type DependenciasMode = "admin" | "view";
