import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * GET /api/health — verifica que Next.js habla con Postgres.
 * Responde { ok: true } si el SELECT 1 funciona.
 */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1 AS ok`);
    return NextResponse.json({ ok: true, db: "up" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Base de datos inalcanzable";
    return NextResponse.json(
      { ok: false, db: "down", error: message },
      { status: 500 },
    );
  }
}
