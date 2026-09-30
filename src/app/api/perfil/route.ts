import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { deleteFromBlob, isBlobUrl } from "@/lib/blob";
import { getFullName, getRolLabel } from "@/components/layout/user";
import { emptyToNull } from "@/lib/perfil";

const CEDULA_RE = /^[0-9]+$/;
const TELEFONO_RE = /^[0-9]{10}$/;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Solo las fotos guardadas en nuestro Blob se intentan borrar; el resto se conserva. */

async function loadCurrent(userId: string) {
  const [user] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      codigo: users.codigo,
      rol: users.rol,
      programa: users.programa,
      fotoUrl: users.fotoUrl,
      cedula: users.cedula,
      telefono: users.telefono,
      firmaUrl: users.firmaUrl,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true), isNull(users.deletedAt)));
  return user ?? null;
}

function toPerfil(user: NonNullable<Awaited<ReturnType<typeof loadCurrent>>>) {
  return {
    nombre: getFullName(user.firstName, user.lastName, user.codigo),
    codigo: user.codigo,
    rol: user.rol,
    rolLabel: getRolLabel(user.rol),
    programa: user.programa ?? "",
    fotoUrl: emptyToNull(user.fotoUrl),
    cedula: emptyToNull(user.cedula),
    telefono: emptyToNull(user.telefono),
    firmaUrl: emptyToNull(user.firmaUrl),
  };
}

/** GET /api/perfil — perfil del usuario autenticado. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const user = await loadCurrent(session.sub);
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  return NextResponse.json({ ok: true, perfil: toPerfil(user) });
}

/**
 * PATCH /api/perfil — completa campos faltantes del propio usuario.
 * Body JSON parcial: { fotoUrl?, cedula?, telefono?, firmaUrl? }.
 * Cédula, teléfono y firma son de un solo registro: si ya tienen valor,
 * solo se acepta el mismo; un valor distinto responde 409.
 */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const current = await loadCurrent(session.sub);
  if (!current) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const patch: { fotoUrl?: string | null; cedula?: string | null; telefono?: string | null; firmaUrl?: string | null } = {};
  let fotoAnterior: string | null = null;

  const fotoUrl = str(body.fotoUrl);
  if (fotoUrl) {
    if (!isHttpsUrl(fotoUrl)) {
      return NextResponse.json({ error: "URL de foto no válida.", field: "foto" }, { status: 400 });
    }
    if (fotoUrl !== current.fotoUrl) {
      patch.fotoUrl = fotoUrl;
      fotoAnterior = current.fotoUrl;
    }
  }

  const cedula = str(body.cedula);
  if (cedula) {
    if (current.cedula && cedula !== current.cedula) {
      return NextResponse.json(
        { error: "La cédula ya está registrada y no se puede modificar.", field: "cedula" },
        { status: 409 },
      );
    }
    if (!current.cedula) {
      if (!CEDULA_RE.test(cedula)) {
        return NextResponse.json({ error: "La cédula solo admite números.", field: "cedula" }, { status: 400 });
      }
      patch.cedula = cedula;
    }
  }

  const telefono = str(body.telefono);
  // Un teléfono previo que no cumple la regla actual se trata como faltante
  // (permite corregirlo); uno válido es inmodificable.
  const telefonoPrevioValido = !!current.telefono && TELEFONO_RE.test(current.telefono);
  if (telefono) {
    if (telefonoPrevioValido && telefono !== current.telefono) {
      return NextResponse.json(
        { error: "El teléfono ya está registrado y no se puede modificar.", field: "telefono" },
        { status: 409 },
      );
    }
    if (!telefonoPrevioValido) {
      if (!TELEFONO_RE.test(telefono)) {
        return NextResponse.json(
          { error: "El teléfono debe tener 10 dígitos numéricos.", field: "telefono" },
          { status: 400 },
        );
      }
      patch.telefono = telefono;
    }
  }

  const firmaUrl = str(body.firmaUrl);
  if (firmaUrl) {
    if (current.firmaUrl && firmaUrl !== current.firmaUrl) {
      return NextResponse.json(
        { error: "La firma ya está registrada y no se puede modificar.", field: "firma" },
        { status: 409 },
      );
    }
    if (!current.firmaUrl) {
      if (!isHttpsUrl(firmaUrl)) {
        return NextResponse.json({ error: "URL de firma no válida.", field: "firma" }, { status: 400 });
      }
      patch.firmaUrl = firmaUrl;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, perfil: toPerfil(current) });
  }

  let updated;
  try {
    [updated] = await db
      .update(users)
      .set(patch)
      .where(and(eq(users.id, session.sub), eq(users.isActive, true), isNull(users.deletedAt)))
      .returning({
        firstName: users.firstName,
        lastName: users.lastName,
        codigo: users.codigo,
        rol: users.rol,
        programa: users.programa,
        fotoUrl: users.fotoUrl,
        cedula: users.cedula,
        telefono: users.telefono,
        firmaUrl: users.firmaUrl,
      });
  } catch (err) {
    const cause = (err as { cause?: { code?: string; constraint_name?: string } })?.cause;
    if (cause?.code === "23505") {
      return NextResponse.json({ error: "Esa cédula ya está registrada.", field: "cedula" }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo guardar el perfil." }, { status: 500 });
  }
  if (!updated) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  // Foto reemplazada: borra la anterior del Blob. Si falla, revierte la DB
  // para mantener la foto actual y responde error (decisión aprobada).
  if (patch.fotoUrl && fotoAnterior && isBlobUrl(fotoAnterior)) {
    try {
      await deleteFromBlob(fotoAnterior);
    } catch {
      try {
        await db.update(users).set({ fotoUrl: fotoAnterior }).where(eq(users.id, session.sub));
      } catch {
        return NextResponse.json(
          { error: "No se pudo subir la foto y el perfil quedó en estado inconsistente. Contacte soporte." },
          { status: 500 },
        );
      }
      try {
        if (patch.fotoUrl && isBlobUrl(patch.fotoUrl)) await deleteFromBlob(patch.fotoUrl);
      } catch {
        // Huérfano en Blob: se mantiene la foto actual, el error ya se reporta abajo.
      }
      return NextResponse.json(
        { error: "No se pudo subir la foto. Se mantiene la actual." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, perfil: toPerfil(updated) });
}
