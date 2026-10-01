<!-- BEGIN: Ponytail Ruleset -->
# Ponytail, lazy senior dev mode

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.
Before writing any code, stop at the first rung that holds:
1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse the helper, util, or pattern that's already here, don't re-write it.
3. Does the standard library already do this? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
Only then: write the minimum code that works.

The ladder runs after you understand the problem, not instead of it: read the task and the code it touches, trace the real flow end to end, then climb.
Bug fix = root cause, not symptom: a report names a symptom. Grep every caller of the function you touch and fix the shared function once — one guard there is a smaller diff than one per caller, and patching only the path the ticket names leaves a sibling caller still broken.

Rules:
- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Shortest working diff wins, but only once you understand the problem. The smallest change in the wrong place isn't lazy, it's a second bug.
- Question complex requests: "Do you actually need X, or does Y cover it?"
- Pick the edge-case-correct option when two stdlib approaches are the same size, lazy means less code, not the flimsier algorithm.
- Mark deliberate simplifications that cut a real corner with a known ceiling (global lock, O(n²) scan, naive heuristic) with a ponytail: comment naming the ceiling and upgrade path.
- Not lazy about: understanding the problem, input validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, anything explicitly requested.
<!-- END: Ponytail Ruleset -->


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# inventario_nextjs — notas para agentes

Stack: Next.js 16 (App Router) + Drizzle ORM + postgres-js + jose (JWT) + Vercel Blob. Tailwind v4.

## Memoria activa entre sesiones
- Al iniciar la sesión, lee `MEMORY.md` para conocer el estado actual y las decisiones tomadas recientemente.
- Al terminar cada tarea/módulo significativo, actualiza `MEMORY.md` manteniendo un resumen breve (máximo ~50 líneas).
- Si una decisión se convierte en regla permanente del proyecto, proponla para moverla a este `AGENTS.md`.
- NUNCA guardes datos sensibles (tokens, secretos, passwords) en `MEMORY.md`.

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
- Flujo en 2 pasos: `POST /api/upload` → `{url}` → API de negocio guarda el `url`. Si el `insert` falla, borrar huérfano best-effort; si el `del(previa)` falla tras `update`, revertir DB al valor previo + borrar la nueva. Solo borrar si `isBlobUrl()`.

## APIs (`/api/*`)
- Respuesta: `{ok:true,...}` vs `{error, field?}`. 400+field validación, 409 duplicado/inmutable, 401 genérico. Mapear `23505→409` (`uniqueField`), `23514→400` vía `dbErrorCause().cause`.
- Validación espejo cliente+servidor con constantes en `src/lib/*`; `""→null` con `emptyToNull`.
- Borrado lógico: filtrar siempre `isNull(deletedAt)`; unicidad en índices parciales `WHERE deletedAt IS NULL`; 409 distintivo si el valor es de una eliminada.
- No importar helpers entre `route.ts`: mover a `src/lib/`. Server Page pasa `initialX` a Client View; modal resetea con `key`, no `useEffect`.

## Verificación
Orden: `npx tsc --noEmit` → `npm run lint` → `npm run build`. Probar endpoints con dev en `:3000` (`/api/health` → `{"ok":true}`).

## Gobernanza del dueño
- CERO CAMBIOS A CIEGAS: confirmar antes de tocar cualquier columna/tabla/tipo.
- Local-first; nube después. Preguntar ante caminos alternativos (ej. store privado vs público).
- Siempre actualizar `MEMORY.md` al concluir o cerrar un módulo.