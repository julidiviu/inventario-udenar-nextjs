import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";

const SELF_ROLES = new Set(["estudiante", "profesor"]);
const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODIGO_RE = /^[0-9]+$/;

/**
 * POST /api/auth/register
 * Body JSON: { firstName, lastName, email, codigo, programa, rol, password, fotoUrl? }
 * - El auto-registro solo permite rol estudiante/profesor (nunca admin/superadmin).
 * - Email obligatorio (auto-lowercase + regex); la cédula queda NULL.
 * - Responde 201 sin iniciar sesión: el cliente cambia a modo login (como en Django).
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const firstName = str(body.firstName);
  const lastName = str(body.lastName);
  const email = str(body.email).toLowerCase();
  const codigo = str(body.codigo);
  const programa = str(body.programa);
  const rol = str(body.rol);
  const password = typeof body.password === "string" ? body.password : "";
  const fotoUrl = str(body.fotoUrl);

  if (
    !firstName ||
    !lastName ||
    !email ||
    !codigo ||
    !programa ||
    !rol ||
    !password
  ) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios." },
      { status: 400 },
    );
  }
  if (!SELF_ROLES.has(rol)) {
    return NextResponse.json(
      { error: "Rol no permitido para el registro." },
      { status: 403 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "El correo no es válido.", field: "email" },
      { status: 400 },
    );
  }
  if (!CODIGO_RE.test(codigo)) {
    return NextResponse.json(
      { error: "El código tiene que ser numérico.", field: "codigo" },
      { status: 400 },
    );
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      {
        error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
        field: "password",
      },
      { status: 400 },
    );
  }
  if (fotoUrl && !/^https?:\/\//.test(fotoUrl)) {
    return NextResponse.json(
      { error: "URL de foto no válida.", field: "foto" },
      { status: 400 },
    );
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar el registro." },
      { status: 500 },
    );
  }

  try {
    const [created] = await db
      .insert(users)
      .values({
        codigo,
        passwordHash,
        rol: rol as "estudiante" | "profesor",
        firstName,
        lastName,
        email,
        programa,
        fotoUrl: fotoUrl || null,
      })
      .returning({
        id: users.id,
        codigo: users.codigo,
        rol: users.rol,
        firstName: users.firstName,
        lastName: users.lastName,
      });
    return NextResponse.json({ ok: true, user: created }, { status: 201 });
  } catch (err) {
    // Drizzle envuelve el error de postgres-js: el 23505 vive en `.cause`.
    const cause = (err as { cause?: { code?: string; constraint_name?: string } })
      ?.cause;
    if (cause?.code === "23505") {
      if (cause.constraint_name === "users_email_unique") {
        return NextResponse.json(
          { error: "Ese correo ya está registrado.", field: "email" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Ese código ya está registrado.", field: "codigo" },
        { status: 409 },
      );
    }
    if (cause?.code === "23514") {
      if (cause?.constraint_name === "users_email_required_check") {
        return NextResponse.json(
          { error: "El correo es obligatorio.", field: "email" },
          { status: 400 },
        );
      }
      if (cause?.constraint_name === "users_codigo_numeric_check") {
        return NextResponse.json(
          { error: "El código tiene que ser numérico.", field: "codigo" },
          { status: 400 },
        );
      }
    }
    return NextResponse.json(
      { error: "No se pudo completar el registro." },
      { status: 500 },
    );
  }
}
