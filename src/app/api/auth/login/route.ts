import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
} from "@/lib/auth";

// Mensaje genérico a propósito: no revela si el código existe o no.
const INVALID = "Credenciales inválidas.";

export async function POST(req: Request) {
  let body: { codigo?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }
  const codigo = typeof body.codigo === "string" ? body.codigo.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!codigo || !password) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.codigo, codigo),
        eq(users.isActive, true),
        isNull(users.deletedAt),
      ),
    );
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  const token = await signSession({
    sub: user.id,
    codigo: user.codigo,
    rol: user.rol,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      codigo: user.codigo,
      rol: user.rol,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
}
