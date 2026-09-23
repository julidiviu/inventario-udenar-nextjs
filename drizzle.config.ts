import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Usa DATABASE_URL de .env.local en local.
    // Para migraciones directas en Neon/Supabase usa la URL "direct" (sin pooler).
    url: process.env.DATABASE_URL!,
  },
});
