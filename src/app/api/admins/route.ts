import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { dependencias, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { deleteFromBlob, isBlobUrl } from "@/lib/blob";
import { dbErrorCause } from "@/lib/dependencias";
import {
  adminUniqueField,
  validateAdminInput,
  validateAdminPassword,
} from "@/lib/admins";

const projection = {
  id: users.id,
  codigo: users.codigo,
  email: users.email,
  cedula: users.cedula,
  firstName: users.firstName,
  lastName: users.lastName,
  telefono: users.telefono,
  programa: users.programa,
  firmaUrl: users.firmaUrl,
  isActive: users.isActive,
};

/**
 * GET /api/admins — lista de admins activos con su dependencia (solo superadmin).
 * Dependencia null = "No asignada" (solo cuentan las dependencias activas).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "superadmin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  const rows = await db
    .select({
      ...projection,
      dependenciaNombre: dependencias.nombre,
    })
    .from(users)
    // Solo la dependencia activa cuenta: el admin de una eliminada figura libre.
    .leftJoin(
      dependencias,
      and(eq(dependencias.administradorId, users.id), isNull(dependencias.deletedAt)),
    )
    .where(and(eq(users.rol, "admin"), isNull(users.deletedAt)))
    .orderBy(asc(users.codigo));

  return NextResponse.json({ ok: true, admins: rows });
}

/** POST /api/admins — crea un admin (solo superadmin, sin dependencia). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "superadmin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const valid = validateAdminInput(body, false);
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }
  const passError = validateAdminPassword(body.password);
  if (passError) {
    return NextResponse.json(passError, { status: 400 });
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(body.password as string);
  } catch {
    return NextResponse.json({ error: "No se pudo crear el administrador." }, { status: 500 });
  }

  try {
    const [row] = await db
      .insert(users)
      .values({ ...valid.data, passwordHash, rol: "admin" })
      .returning(projection);
    return NextResponse.json({ ok: true, admin: { ...row, dependenciaNombre: null } }, { status: 201 });
  } catch (err) {
    const { code, constraint } = dbErrorCause(err);
    // La firma se subió antes del insert: si falla, no dejar huérfano en Blob
    // (la DB nunca la referenció, no hay nada que revertir).
    const subida = valid.data.firmaUrl;
    if (subida && isBlobUrl(subida)) {
      try {
        await deleteFromBlob(subida);
      } catch {
        // Best-effort: el error que se reporta es el del insert.
      }
    }
    if (code === "23505") {
      const field = adminUniqueField(constraint);
      return NextResponse.json({ error: "Ese valor ya está registrado.", field }, { status: 409 });
    }
    if (code === "23514") {
      return NextResponse.json({ error: "El correo es obligatorio para el rol admin.", field: "email" }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo crear el administrador." }, { status: 500 });
  }
}
