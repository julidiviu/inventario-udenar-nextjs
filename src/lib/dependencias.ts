import { emptyToNull } from "@/lib/perfil";

/** Código de negocio: entero de máximo 5 dígitos (espejo del CHECK en DB). */
export const CODIGO_RE = /^[0-9]{1,5}$/;
export const NOMBRE_MAX = 100;

export interface DependenciaInput {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  administradorId: string | null;
}

export interface ValidationFailure {
  error: string;
  field: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Valida el body de POST/PATCH (PATCH acepta parcial).
 * Normaliza "" → null en opcionales (regla del proyecto).
 */
export function validateDependenciaInput(
  body: Record<string, unknown>,
  partial: false,
): { data: DependenciaInput } | ValidationFailure;
export function validateDependenciaInput(
  body: Record<string, unknown>,
  partial: true,
): { data: Partial<DependenciaInput> } | ValidationFailure;
export function validateDependenciaInput(
  body: Record<string, unknown>,
  partial: boolean,
): { data: Partial<DependenciaInput> } | ValidationFailure {
  const data: Partial<DependenciaInput> = {};

  if ("codigo" in body || !partial) {
    const codigo = str(body.codigo);
    if (!CODIGO_RE.test(codigo)) {
      return { error: "El código debe ser un número de máximo 5 dígitos.", field: "codigo" };
    }
    data.codigo = codigo;
  }
  if ("nombre" in body || !partial) {
    const nombre = str(body.nombre);
    if (!nombre || nombre.length > NOMBRE_MAX) {
      return { error: "El nombre es requerido (máximo 100 caracteres).", field: "nombre" };
    }
    data.nombre = nombre;
  }
  if ("descripcion" in body || !partial) {
    data.descripcion = emptyToNull(str(body.descripcion));
  }
  if ("imagenUrl" in body || !partial) {
    data.imagenUrl = emptyToNull(str(body.imagenUrl));
  }
  if ("administradorId" in body || !partial) {
    data.administradorId = emptyToNull(str(body.administradorId));
  }
  return { data };
}

/** 23505 → campo del formulario según la constraint violada. */
export function uniqueField(constraint: string | undefined): string {
  if (constraint?.includes("codigo")) return "codigo";
  if (constraint?.includes("nombre")) return "nombre";
  if (constraint?.includes("admin")) return "administradorId";
  return "codigo";
}

export function dbErrorCause(err: unknown): { code?: string; constraint?: string } {
  const cause = (err as { cause?: { code?: string; constraint_name?: string } })?.cause;
  return { code: cause?.code, constraint: cause?.constraint_name };
}
