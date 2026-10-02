// Espejo de `tipos_recurso` + `recursos` (src/db/schema/inventario.ts). Sin campos extra.
export interface TipoRecurso {
  id: number;
  nombre: string;
  dependenciaId: number;
}

export interface Recurso {
  id: number;
  // QR institucional manual, obligatorio y UNIQUE (no es PK)
  qr: string;
  // FK -> tiposRecurso.id. Sin dependencia_id: se obtiene vía tipo.dependenciaId.
  tipoId: number;
  nombre: string;
  descripcion: string;
  fotoUrl: string | null;
  // 1-a-1: una fila = una unidad física
  disponible: boolean;
}

// Consistente con DependenciasMode ("admin" | "view").
export type InventarioMode = "admin" | "view";

export type FiltroDisponibilidad = "todos" | "disponibles" | "prestados";

// Agrupación para el accordion (cerrados por defecto).
export interface TipoConRecursos extends TipoRecurso {
  recursos: Recurso[];
}
