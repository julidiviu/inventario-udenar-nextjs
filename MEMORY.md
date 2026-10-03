# MEMORY.md — Estado del Proyecto inventario_nextjs

## Estado Actual
- Perfil completado: foto (recorte circular, reemplazo con rollback), cédula inmutable, teléfono 10 dígitos (previo inválido = corregible), firma canvas/upload inmutable. `""→null` con `emptyToNull`.
- Dependencias Full CRUD conectado a PG local: superadmin crea/edita/elimina (lógico), `GET /api/admins/disponibles?dependenciaId` para el selector; estudiante/profesor solo lectura; rol `admin` redirige a `/dashboard`.
- Upload en 2 pasos (`/api/upload` → `{url}` → API negocio) con limpieza de huérfanos y `isBlobUrl()` como guard.
- Préstamos Fase 1 (solo lectura): vista unificada `PrestamosView` (`scope="propias"|"dependencia"`, fuente tabla `prestamos` con filtro `?estado=todas|pendiente|devuelto` → booleano `devuelto` en `src/lib/prestamos.ts`); fecha devolución dinámica (pactada vs real), contador `diasHasta()` con `hoyBogota()` (verde faltan/vence hoy, rojo retraso, `—` si devuelto); admin: links a `/inventario` y `/usuarios/[id]`, acciones deshabilitadas (Devolver/Extender/Contrato); propias: link a `/dependencias/[id]`, sin columna acciones. Nav cableada en `navigation.ts` (`Sidebar` sin cambios).
- Paginación+búsqueda en servidor (solicitudes y préstamos, 4 pages + 2 vistas): `?estado=&pagina=&q=`; `count(*)` + `limit(15).offset()` con `orderBy(desc(id))` estable; `FILAS_POR_PAGINA=15`, `parsePagina/parseQuery/escapeIlike/hrefConParams` en `src/lib/paginacion.ts`; shadcn `ui/pagination.tsx` + `ui/Paginador.tsx` compartido (solo visible con 2+ páginas, links `next/link` vía `asChild`); buscador con debounce 400ms → `router.replace` + reset a página 1; mutar solicitud hace `router.refresh()` (conteos siempre consistentes). Probado con 17 filas temporales (página 2 OK) y limpiado sin restos.
- Solicitudes Fase 1 (solo lectura): vista unificada `SolicitudesView` (`scope="propias"|"dependencia"`, columna visible `QR`, buscador cliente QR/recurso/usuario); rutas server filtran por rol y `?estado=`; acciones placeholder deshabilitadas (admin: Aprobar/Rechazar en pendiente, Contrato en aprobada; propias: Cancelar en pendiente, vacío si no). Contrato vía `LEFT JOIN prestamos` (columna vive ahí desde migración 0008).
- Inventario conectado a PG real (sin mocks): `GET /api/inventario`, `POST /api/recursos`, `PATCH/DELETE /api/recursos/[id]` (solo admin, borrado FÍSICO + cascada con conteos 409 + limpieza tipos vacíos + Blob best-effort), `POST /api/solicitudes` (solo estudiante/profesor, perfil completo, disponible, fecha ≥5 hábiles); validación espejo en `src/lib/recursos.ts` (QR `^[0-9]{1,8}$`, nombre 100, descripción 800); `/dependencias/[id]` redirige a admin/superadmin.
- DB: migración 0007 (`CHECK recursos_qr_check`, `DROP prestamos.firmado_url` sin uso); `deletedAt` de recursos intacto sin uso (B1); timezone `America/Bogota` a nivel DB + `hoyBogota()` en servidor (fechas Colombia).
- DB: migración 0008 (`DROP solicitudes_prestamo.contrato_solicitud_url` muerta, 0 filas con valor); contrato vive solo en `prestamos.contrato_prestamo_url`; `solicitudesPrestamoRelations` suma inverso 1-a-1 `prestamo` vía `prestamos.solicitudId`; cascada de recursos y allowlist Blob ya solo conocen `contratos_prestamo`.

## Decisiones Técnicas Recientes
- Borrado lógico libera `codigo`/`nombre`/`administradorId` de eliminadas; 409 distintivo si el valor es de una eliminada.
- Validación espejo: `CODIGO_RE`/`NOMBRE_MAX` en `src/lib/dependencias.ts` usadas por modal y route.
- Contrato API: `{ok}` vs `{error, field?}`; `23505→409`, `23514→400` vía `dbErrorCause().cause`.
- Server Page + Client View con `initialX`; modal remonta con `key`, sin `useEffect`.
- `DialogContent` (`ui/dialog.tsx`) con `max-h-[calc(100dvh-2rem)] overflow-y-auto`: los modales largos (ej. RecursoModal) desplazan en pantallas de poca altura y Guardar/Cancelar siempre alcanzables.
- Tema claro/oscuro sin dependencias: `src/lib/theme.ts` (clave + script pre-paint), `ThemeToggle` con guard `mounted` (sin mismatch) y snapshot solo de la clase `.dark`; layout usa `<script>` plano bloqueante (no `next/script`); `globals.css` ata `--background`/`--foreground` a `.dark`; `DependenciaCard` navega con `next/link` (SPA, conserva la clase).

## Próximos Pasos
- Módulo inventario/recursos: UI + API completas. Pendiente: probar flujo E2E con usuarios reales (crear tipo/recurso, solicitar, eliminar en cascada).
- Solicitudes con links: admin (usuario → `/usuarios/[id]` perfil completo; recurso → `/inventario?tipo=&destacar=`) y propias (recurso → `/dependencias/[id]?tipo=&destacar=`, columna `Dependencia` tras Recurso con buscador incluido); acordeón vía `defaultValue` + anillo + `scrollIntoView` en `RecursoCard` (ambos modos); params inválidos se ignoran.
- Flujo "Solicitar Préstamo" completo E2E (solicitar→aprobar/rechazar→préstamo + notificaciones visibles en campanita). Pendiente: check visual autenticado, módulo de préstamos (`/mis-prestamos`, retomar `urlParaTipo`) y email a futuro.
- Deuda: mover `findAssignableAdmin`/`describeDeletedConflict` de `route.ts` a `src/lib/` (import cruzado frágil).
