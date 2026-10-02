# MEMORY.md — Estado del Proyecto inventario_nextjs

## Estado Actual
- Perfil completado: foto (recorte circular, reemplazo con rollback), cédula inmutable, teléfono 10 dígitos (previo inválido = corregible), firma canvas/upload inmutable. `""→null` con `emptyToNull`.
- Dependencias Full CRUD conectado a PG local: superadmin crea/edita/elimina (lógico), `GET /api/admins/disponibles?dependenciaId` para el selector; estudiante/profesor solo lectura; rol `admin` redirige a `/dashboard`.
- Upload en 2 pasos (`/api/upload` → `{url}` → API negocio) con limpieza de huérfanos y `isBlobUrl()` como guard.
- Navegación por rol (`src/lib/navigation.ts`, resto `FUTURE="#"`); dashboard aún con `mocks/dashboard.ts`.
- Inventario conectado a PG real (sin mocks): `GET /api/inventario`, `POST /api/recursos`, `PATCH/DELETE /api/recursos/[id]` (solo admin, borrado FÍSICO + cascada con conteos 409 + limpieza tipos vacíos + Blob best-effort), `POST /api/solicitudes` (solo estudiante/profesor, perfil completo, disponible, fecha ≥5 hábiles); validación espejo en `src/lib/recursos.ts` (QR `^[0-9]{1,8}$`, nombre 100, descripción 800); `/dependencias/[id]` redirige a admin/superadmin.
- DB: migración 0007 (`CHECK recursos_qr_check`, `DROP prestamos.firmado_url` sin uso); `deletedAt` de recursos intacto sin uso (B1); timezone `America/Bogota` a nivel DB + `hoyBogota()` en servidor (fechas Colombia).
- DB: migraciones 0005 (CHECK código 5 dígitos) y 0006 (UNIQUE parciales `WHERE deleted_at IS NULL`); schema `inventario.ts`/`prestamos.ts` modelado sin APIs/UI.

## Decisiones Técnicas Recientes
- Borrado lógico libera `codigo`/`nombre`/`administradorId` de eliminadas; 409 distintivo si el valor es de una eliminada.
- Validación espejo: `CODIGO_RE`/`NOMBRE_MAX` en `src/lib/dependencias.ts` usadas por modal y route.
- Contrato API: `{ok}` vs `{error, field?}`; `23505→409`, `23514→400` vía `dbErrorCause().cause`.
- Server Page + Client View con `initialX`; modal remonta con `key`, sin `useEffect`.
- `DialogContent` (`ui/dialog.tsx`) con `max-h-[calc(100dvh-2rem)] overflow-y-auto`: los modales largos (ej. RecursoModal) desplazan en pantallas de poca altura y Guardar/Cancelar siempre alcanzables.
- Tema claro/oscuro sin dependencias: `src/lib/theme.ts` (clave + script pre-paint), `ThemeToggle` con guard `mounted` (sin mismatch) y snapshot solo de la clase `.dark`; layout usa `<script>` plano bloqueante (no `next/script`); `globals.css` ata `--background`/`--foreground` a `.dark`; `DependenciaCard` navega con `next/link` (SPA, conserva la clase).

## Próximos Pasos
- Módulo inventario/recursos: UI + API completas. Pendiente: probar flujo E2E con usuarios reales (crear tipo/recurso, solicitar, eliminar en cascada).
- Flujo "Solicitar Préstamo" (aprobación/rechazo por admin) aún no existe como UI.
- Deuda: mover `findAssignableAdmin`/`describeDeletedConflict` de `route.ts` a `src/lib/` (import cruzado frágil).
