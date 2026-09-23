<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# inventario_nextjs — notas para agentes

Stack: Next.js 16 (App Router) + Drizzle ORM + postgres-js + jose (JWT) + Vercel Blob. Tailwind v4.

## Shell (Windows PowerShell)
- Separador `;`, NO `&&`. `Remove-Item a,b` (no `del a b`).
- Drizzle-kit NO lee `.env.local`: usar siempre los scripts `db:*` (ya envueltos con `dotenv-cli`). `next dev` sí lo lee, pero exige reinicio ante vars nuevas.

## Base de datos local
- Docker Postgres 16 `inventario_postgres` en puerto **5433** — el 5432 lo ocupa `postgres_db` (Django, no tocar). `docker compose up -d` lo levanta; volumen conserva datos.
- Docker Desktop está instalado per-user: `$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe`.
- `DATABASE_URL` local apunta a `:5433`. Nube (Neon) pendiente: URL pooled para la app, directa para migraciones.

## Drizzle (`src/db/`)
- Schema partido: `schema/enums.ts`, `schema/auth.ts` (users uuid + dependencias), `schema/inventario.ts`, `schema/prestamos.ts`. Barrel en `schema.ts`, cliente en `index.ts` (`max: 1`, pensado para serverless).
- `relations()` una sola vez por tabla: `usersRelations` vive en `prestamos.ts` (evita import circular con `auth.ts`).
- `$onUpdate` y `many()` no generan SQL: `db:generate` debe decir "No schema changes".
- Reglas de negocio en DB, no solo en app: UNIQUE parcial solicitud pendiente, UNIQUE parcial préstamo activo, CHECKs de fechas, todo `RESTRICT` salvo notificaciones (`CASCADE`) y `administrador` (`SET NULL`). PKs híbridas: uuid users, serial resto.
- Migraciones en `drizzle/`. Testear reglas con `psql` + `SAVEPOINT`/`ROLLBACK`; ojo: las secuencias NO hacen rollback → usar subselects, nunca ids hardcodeados.

## Scripts (`scripts/`, `tsx`)
- Todo script CLI que use `db` debe llamar `closeDb()` al final o el proceso no termina (pool abierto).
- `seed-admin.ts`: interactivo (readline) + flags (`--help`). stdin por tubería/redirección NO llega a readline en este entorno: para pruebas automatizadas usar flags.
- Borrar scripts `tmp-*.ts` tras usarlos. No dejar filas de prueba: los 2 usuarios reales son intocables.

## Auth (`src/lib/auth.ts`, `/api/auth/*`)
- `jose` HS256, cookie `session` httpOnly `SameSite=Lax` (`Secure` en prod), **2h** en JWT y cookie. `AUTH_SECRET` ≥32 chars en `.env.local`.
- Login por `codigo` (no email), 401 genérico `"Credenciales inválidas."` en ambos casos. `/me` revalida activo en DB. `superadmin` > `admin` > resto.

## Uploads (`/api/upload`, `src/lib/blob.ts`)
- Store Blob debe ser **PÚBLICO** (uno privado rechaza `put` público). En DB solo URLs `text`, nunca binarios.
- Validar antes del `put` (tipo/tamaño/carpeta). Allowlist de prefijos provisional (espejo de Django); la organización final se decide por formulario, no globalmente.

## Verificación
Orden: `npx tsc --noEmit` → `npm run lint` → `npm run build`. Probar endpoints con dev en `:3000` (`/api/health` → `{"ok":true}`).

## Gobernanza del dueño
- CERO CAMBIOS A CIEGAS: confirmar antes de tocar cualquier columna/tabla/tipo.
- Local-first; nube después. Preguntar ante caminos alternativos (ej. store privado vs público).
