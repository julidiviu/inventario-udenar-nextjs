import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta DATABASE_URL. Cópiala de .env.example a .env.local (Docker: postgresql://postgres:postgres@localhost:5432/inventario).",
  );
}

// postgres-js funciona en local (Docker) y en Neon con pooler para Vercel.
// En serverless usa max: 1 por instancia para no agotar conexiones del tier gratis.
const client = postgres(connectionString, { max: 1 });

export const db = drizzle(client, { schema });
export type Db = typeof db;

/** Cierra el pool. Úsalo al final de scripts CLI (seed, etc.) o el proceso no termina. */
export async function closeDb(): Promise<void> {
  await client.end();
}
