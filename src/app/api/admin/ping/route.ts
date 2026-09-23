import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Demo de autorización por rol (solo para probar el paso 5 sin UI).
 * superadmin pasa todo; admin solo su dependencia (aquí: check de rol).
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.rol !== "admin" && session.rol !== "superadmin") {
    return NextResponse.json({ error: "Prohibido." }, { status: 403 });
  }
  return NextResponse.json({ ok: true, rol: session.rol });
}
