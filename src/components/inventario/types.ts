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

// Suma días hábiles saltando sábados y domingos (regla: 5 hábiles, sin tope máximo).
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

export const MOCK_DEPENDENCIA_ID = 1;
export const MOCK_DEPENDENCIA_NOMBRE = "Laboratorio de Ciencias";

export const MOCK_TIPOS: TipoRecurso[] = [
  { id: 1, nombre: "Equipos", dependenciaId: MOCK_DEPENDENCIA_ID },
  { id: 2, nombre: "Reactivos", dependenciaId: MOCK_DEPENDENCIA_ID },
  { id: 3, nombre: "Mobiliario", dependenciaId: MOCK_DEPENDENCIA_ID },
];

export const MOCK_RECURSOS: Recurso[] = [
  {
    id: 1,
    qr: "QR-001",
    tipoId: 1,
    nombre: "Microscopio óptico",
    descripcion: "Microscopio binocular con objetivos 4x, 10x y 40x.",
    fotoUrl: null,
    disponible: true,
  },
  {
    id: 2,
    qr: "QR-002",
    tipoId: 1,
    nombre: "Centrífuga de mesa",
    descripcion: "Centrífuga digital de 12 tubos, hasta 5000 rpm.",
    fotoUrl: null,
    disponible: false,
  },
  {
    id: 3,
    qr: "QR-003",
    tipoId: 1,
    nombre: "Multímetro digital",
    descripcion: "Multímetro con medición de voltaje, corriente y resistencia.",
    fotoUrl: null,
    disponible: true,
  },
  {
    id: 4,
    qr: "QR-004",
    tipoId: 2,
    nombre: "Ácido clorhídrico 1L",
    descripcion: "Reactivo grado analítico, frasco de 1 litro.",
    fotoUrl: null,
    disponible: true,
  },
  {
    id: 5,
    qr: "QR-005",
    tipoId: 2,
    nombre: "Hidróxido de sodio 500g",
    descripcion: "Sosa cáustica en pellets, frasco de 500 gramos.",
    fotoUrl: null,
    disponible: false,
  },
  {
    id: 6,
    qr: "QR-006",
    tipoId: 3,
    nombre: "Mesa de laboratorio",
    descripcion: "Mesa de acero inoxidable con entrepaño.",
    fotoUrl: null,
    disponible: true,
  },
  {
    id: 7,
    qr: "QR-007",
    tipoId: 3,
    nombre: "Silla giratoria",
    descripcion: "Silla giratoria con altura ajustable.",
    fotoUrl: null,
    disponible: true,
  },
];
