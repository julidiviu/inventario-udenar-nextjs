import { NextResponse } from "next/server";
import { db } from "@/db";
import { recursos } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { deleteFromBlob, isBlobUrl } from "@/lib/blob";
import { dbErrorCause } from "@/lib/dependencias";
import { uniqueFieldRecurso, validateRecursoInput } from "@/lib/recursos";
import { adminDependenciaId, resolveTipo } from "@/lib/recursos-db";

const projection = {
  id: recursos.id,
  qr: recursos.qr,
  tipoId: recursos.tipoId,
  nombre: recursos.nombre,
  descripcion: recursos.descripcion,
  fotoUrl: recursos.fotoUrl,
  disponible: recursos.disponible,
};

/** POST /api/recursos — solo admin (usa su dependencia asignada). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (session.rol !== "admin") return NextResponse.json({ error: "Prohibido." }, { status: 403 });

  const dependenciaId = await adminDependenciaId(session.sub);
  if (dependenciaId === null) {
    return NextResponse.json(
      { error: "No administras ninguna dependencia. Pide al superadmin que te asigne una." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const valid = validateRecursoInput(body, false);
  if ("error" in valid) {
    return NextResponse.json({ error: valid.error, field: valid.field }, { status: 400 });
  }

  const tipo = await resolveTipo(dependenciaId, valid.data.tipoId ?? undefined, valid.data.nuevoTipo ?? undefined);
  if (!tipo) {
    return NextResponse.json({ error: "El tipo de recurso no es válido.", field: "tipoId" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(recursos)
      .values({
        qr: valid.data.qr,
        tipoId: tipo.id,
        nombre: valid.data.nombre,
        descripcion: valid.data.descripcion,
        fotoUrl: valid.data.fotoUrl,
      })
      .returning(projection);
    return NextResponse.json(
      { ok: true, recurso: row, tipo: { id: tipo.id, nombre: tipo.nombre, dependenciaId } },
      { status: 201 },
    );
  } catch (err) {
    const { code, constraint } = dbErrorCause(err);
    // La foto se subió antes del insert: si falla, no dejar huérfano en Blob.
    const subida = valid.data.fotoUrl;
    if (subida && isBlobUrl(subida)) {
      try {
        await deleteFromBlob(subida);
      } catch {
        // Best-effort: el error que se reporta es el del insert.
      }
    }
    if (code === "23505") {
      const field = uniqueFieldRecurso(constraint);
      return NextResponse.json(
        { error: "Ese código QR ya está registrado.", field },
        { status: 409 },
      );
    }
    if (code === "23514") {
      return NextResponse.json(
        { error: "El código QR debe ser numérico de máximo 8 dígitos.", field: "qr" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "No se pudo crear el recurso." }, { status: 500 });
  }
}
