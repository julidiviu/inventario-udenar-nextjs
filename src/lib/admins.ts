import { emptyToNull } from "@/lib/perfil";

/** Código de users: numérico sin límite de dígitos (espejo del CHECK en DB). */
export const ADMIN_CODIGO_RE = /^[0-9]+$/;
export const ADMIN_CEDULA_RE = /^[0-9]+$/;
export const ADMIN_TELEFONO_RE = /^[0-9]{10}$/;
export const ADMIN_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ADMIN_NOMBRE_MAX = 100;
export const ADMIN_PROGRAMA_MAX = 100;
export const ADMIN_MIN_PASSWORD = 8;

export interface AdminInput {
  codigo: string;
  email: string;
  cedula: string | null;
  firstName: string;
  lastName: string;
  telefono: string | null;
  programa: string | null;
  firmaUrl: string | null;
  /** Solo PATCH: el POST siempre crea activos. */
  isActive: boolean;
}

export interface ValidationFailure {
  error: string;
  field: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Valida el body de POST/PATCH de admins (PATCH acepta parcial).
 * La contraseña se valida aparte (opcional en PATCH, obligatoria en POST).
 * Normaliza "" → null en opcionales (regla del proyecto).
 */
export function validateAdminInput(
  body: Record<string, unknown>,
  partial: false,
): { data: AdminInput } | ValidationFailure;
export function validateAdminInput(
  body: Record<string, unknown>,
  partial: true,
): { data: Partial<AdminInput> } | ValidationFailure;
export function validateAdminInput(
  body: Record<string, unknown>,
  partial: boolean,
): { data: Partial<AdminInput> } | ValidationFailure {
  const data: Partial<AdminInput> = {};

  if ("codigo" in body || !partial) {
    const codigo = str(body.codigo);
    if (!ADMIN_CODIGO_RE.test(codigo)) {
      return { error: "El código tiene que ser numérico.", field: "codigo" };
    }
    data.codigo = codigo;
  }
  if ("email" in body || !partial) {
    const email = str(body.email).toLowerCase();
    if (!ADMIN_EMAIL_RE.test(email)) {
      return { error: "El correo no es válido.", field: "email" };
    }
    data.email = email;
  }
  if ("cedula" in body || !partial) {
    const cedula = emptyToNull(str(body.cedula));
    if (cedula && !ADMIN_CEDULA_RE.test(cedula)) {
      return { error: "La cédula solo admite números.", field: "cedula" };
    }
    data.cedula = cedula;
  }
  if ("firstName" in body || !partial) {
    const firstName = str(body.firstName);
    if (!firstName || firstName.length > ADMIN_NOMBRE_MAX) {
      return { error: "Los nombres son requeridos (máximo 100 caracteres).", field: "firstName" };
    }
    data.firstName = firstName;
  }
  if ("lastName" in body || !partial) {
    const lastName = str(body.lastName);
    if (!lastName || lastName.length > ADMIN_NOMBRE_MAX) {
      return { error: "Los apellidos son requeridos (máximo 100 caracteres).", field: "lastName" };
    }
    data.lastName = lastName;
  }
  if ("telefono" in body || !partial) {
    const telefono = emptyToNull(str(body.telefono));
    if (telefono && !ADMIN_TELEFONO_RE.test(telefono)) {
      return { error: "El teléfono debe tener 10 dígitos numéricos.", field: "telefono" };
    }
    data.telefono = telefono;
  }
  // Programa y firma siempre opcionales (crear y editar).
  if ("programa" in body || !partial) {
    const programa = emptyToNull(str(body.programa));
    if (programa && programa.length > ADMIN_PROGRAMA_MAX) {
      return { error: "El programa no puede superar los 100 caracteres.", field: "programa" };
    }
    data.programa = programa;
  }
  if ("firmaUrl" in body || !partial) {
    const firmaUrl = emptyToNull(str(body.firmaUrl));
    if (firmaUrl && !isHttpsUrl(firmaUrl)) {
      return { error: "URL de firma no válida.", field: "firma" };
    }
    data.firmaUrl = firmaUrl;
  }
  // Activo solo editable en PATCH (el POST siempre crea activos).
  if (partial && "isActive" in body) {
    if (typeof body.isActive !== "boolean") {
      return { error: "Valor de estado inválido.", field: "isActive" };
    }
    data.isActive = body.isActive;
  }
  return { data };
}

/** Valida una contraseña plana (crear o reset). Vacía = no cambia (solo PATCH). */
export function validateAdminPassword(password: unknown): { error: string; field: string } | null {
  if (typeof password !== "string" || password.length < ADMIN_MIN_PASSWORD) {
    return {
      error: `La contraseña debe tener al menos ${ADMIN_MIN_PASSWORD} caracteres.`,
      field: "password",
    };
  }
  return null;
}

/** 23505 → campo del formulario según la constraint violada. */
export function adminUniqueField(constraint: string | undefined): string {
  if (constraint?.includes("email")) return "email";
  if (constraint?.includes("cedula")) return "cedula";
  return "codigo";
}
