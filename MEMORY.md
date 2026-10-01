# MEMORY.md — Estado del Proyecto inventario_nextjs

## Estado Actual
- Perfil completado: foto (recorte circular, reemplazo con rollback), cédula inmutable, teléfono 10 dígitos (previo inválido = corregible), firma canvas/upload inmutable. `""→null` con `emptyToNull`.
- Dependencias Full CRUD conectado a PG local: superadmin crea/edita/elimina (lógico), `GET /api/admins/disponibles?dependenciaId` para el selector; estudiante/profesor solo lectura; rol `admin` redirige a `/dashboard`.
- Upload en 2 pasos (`/api/upload` → `{url}` → API negocio) con limpieza de huérfanos y `isBlobUrl()` como guard.
- Navegación por rol (`src/lib/navigation.ts`, resto `FUTURE="#"`); dashboard aún con `mocks/dashboard.ts`.
- Inventario UI mock-first (`src/components/inventario/`: `types.ts` + `InventarioView` + `RecursoCard` + `RecursoModal` + `SolicitudModal`, `mode: "admin"|"view"`); `/inventario` (admin, aviso si sin dependencia) y `/dependencias/[id]` (view, perfil real + pendientes reales, recursos mock); accordion `@radix-ui/react-accordion` + `react-day-picker` (min +5 hábiles, sin finde, sin tope); `navigation.ts` Inventario→`/inventario`, `DependenciaCard`→`/dependencias/[id]`.
- DB: migraciones 0005 (CHECK código 5 dígitos) y 0006 (UNIQUE parciales `WHERE deleted_at IS NULL`); schema `inventario.ts`/`prestamos.ts` modelado sin APIs/UI.

## Decisiones Técnicas Recientes
- Borrado lógico libera `codigo`/`nombre`/`administradorId` de eliminadas; 409 distintivo si el valor es de una eliminada.
- Validación espejo: `CODIGO_RE`/`NOMBRE_MAX` en `src/lib/dependencias.ts` usadas por modal y route.
- Contrato API: `{ok}` vs `{error, field?}`; `23505→409`, `23514→400` vía `dbErrorCause().cause`.
- Server Page + Client View con `initialX`; modal remonta con `key`, sin `useEffect`.
- Tema claro/oscuro sin dependencias: `src/lib/theme.ts` (clave + script pre-paint), `ThemeToggle` con guard `mounted` (sin mismatch) y snapshot solo de la clase `.dark`; layout usa `<script>` plano bloqueante (no `next/script`); `globals.css` ata `--background`/`--foreground` a `.dark`; `DependenciaCard` navega con `next/link` (SPA, conserva la clase).

## Próximos Pasos
- Módulo "Recursos por Dependencia": UI lista con mocks, falta API (tipos/recursos ya en schema).
- Flujo "Solicitar Préstamo" (solicitudes/préstamos ya en schema; modal guarda pendiente solo en estado local).
- Deuda: mover `findAssignableAdmin`/`describeDeletedConflict` de `route.ts` a `src/lib/` (import cruzado frágil).
