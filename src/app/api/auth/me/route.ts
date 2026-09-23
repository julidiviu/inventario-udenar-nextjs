import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";

/** Sesión actual. 401 si no hay cookie válida o el usuario ya no está activo. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const [user] = await db
    .select({
      id: users.id,
      codigo: users.codigo,
      rol: users.rol,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(
      and(
        eq(users.id, session.sub),
        eq(users.isActive, true),
        isNull(users.deletedAt),
      ),
    );
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, user });
}
