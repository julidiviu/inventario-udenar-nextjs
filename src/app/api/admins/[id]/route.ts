import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
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

/** PATCH /api/admins/[id] — parcial, solo superadmin. Password vacía = no cambia. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "superadmin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });
  const id = (await params).id;
  if (!id) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const valid = validateAdminInput(body, true);
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }

  // Reset opcional: solo si viene no vacía (nunca se devuelve el hash).
  let passwordHash: string | undefined;
  if (typeof body.password === "string" && body.password !== "") {
    const passError = validateAdminPassword(body.password);
    if (passError) {
      return NextResponse.json(passError, { status: 400 });
    }
    try {
      passwordHash = await hashPassword(body.password);
    } catch {
      return NextResponse.json({ error: "No se pudo actualizar el administrador." }, { status: 500 });
    }
  }

  const patch = passwordHash ? { ...valid.data, passwordHash } : valid.data;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
  }

  let previa: string | null = null;
  try {
    const [current] = await db
      .select({ firmaUrl: users.firmaUrl })
      .from(users)
      .where(and(eq(users.id, id), eq(users.rol, "admin"), isNull(users.deletedAt)));
    if (!current) return NextResponse.json({ error: "Administrador no encontrado." }, { status: 404 });
    previa = current.firmaUrl;

    const [row] = await db
      .update(users)
      .set(patch)
      .where(and(eq(users.id, id), eq(users.rol, "admin"), isNull(users.deletedAt)))
      .returning(projection);
    if (!row) return NextResponse.json({ error: "Administrador no encontrado." }, { status: 404 });

    // Firma reemplazada: borra la anterior del Blob. Si falla, revierte la DB
    // para mantener la firma actual y responde error (patrón de /api/perfil).
    const nueva = row.firmaUrl;
    if (nueva && previa && nueva !== previa && isBlobUrl(previa)) {
      try {
        await deleteFromBlob(previa);
      } catch {
        try {
          await db.update(users).set({ firmaUrl: previa }).where(eq(users.id, id));
        } catch {
          return NextResponse.json(
            { error: "No se pudo reemplazar la firma y el administrador quedó en estado inconsistente. Contacte soporte." },
            { status: 500 },
          );
        }
        try {
          if (isBlobUrl(nueva)) await deleteFromBlob(nueva);
        } catch {
          // Huérfano en Blob: se mantiene la firma actual, el error ya se reporta abajo.
        }
        return NextResponse.json(
          { error: "No se pudo reemplazar la firma. Se mantiene la actual." },
          { status: 500 },
        );
      }
    }
    return NextResponse.json({ ok: true, admin: row });
  } catch (err) {
    const { code, constraint } = dbErrorCause(err);
    if (code === "23505") {
      const field = adminUniqueField(constraint);
      return NextResponse.json({ error: "Ese valor ya está registrado.", field }, { status: 409 });
    }
    // La firma se subió antes del update: si falla y la DB nunca la referenció
    // (difiere de la previa), no dejar huérfano en Blob.
    const subida = valid.data.firmaUrl;
    if (subida && subida !== previa && isBlobUrl(subida)) {
      try {
        await deleteFromBlob(subida);
      } catch {
        // Best-effort: el error que se reporta es el del update.
      }
    }
    return NextResponse.json({ error: "No se pudo actualizar el administrador." }, { status: 500 });
  }
}
