import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { dependencias, users } from "./auth";
import { recursos } from "./inventario";
import { estadoSolicitudEnum, tipoNotificacionEnum } from "./enums";

/**
 * Cierre de semestre: tope máximo elegible al solicitar/extender (una sola
 * fila, id=1; sin fila = sin tope). Lo fija el superadmin desde /calendario.
 * No es un CHECK (no puede leer otra tabla): se valida en las APIs.
 */
export const cierreSemestre = pgTable("cierre_semestre", {
  id: integer("id").primaryKey().default(1),
  fecha: date("fecha").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const solicitudesPrestamo = pgTable(
  "solicitudes_prestamo",
  {
    id: serial("id").primaryKey(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    recursoId: integer("recurso_id")
      .notNull()
      .references(() => recursos.id, { onDelete: "restrict" }),
    fechaSolicitud: timestamp("fecha_solicitud", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Fecha programada pedida por el estudiante
    fechaDevolucion: date("fecha_devolucion").notNull(),
    estado: estadoSolicitudEnum("estado").notNull().default("pendiente"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Regla aprobada: un usuario no repite pendiente sobre el mismo recurso
    uniqueIndex("solicitudes_usuario_recurso_pendiente_uniq")
      .on(table.usuarioId, table.recursoId)
      .where(sql`${table.estado} = 'pendiente'`),
    check(
      "solicitudes_fecha_check",
      sql`fecha_devolucion >= fecha_solicitud::date`,
    ),
    index("solicitudes_estado_idx").on(table.estado),
  ],
);

export const prestamos = pgTable(
  "prestamos",
  {
    id: serial("id").primaryKey(),
    // Trazabilidad aprobada: qué solicitud originó el préstamo (nullable por historial Django sin vínculo)
    solicitudId: integer("solicitud_id")
      .unique()
      .references(() => solicitudesPrestamo.id, { onDelete: "restrict" }),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    recursoId: integer("recurso_id")
      .notNull()
      .references(() => recursos.id, { onDelete: "restrict" }),
    // = momento de aprobación por el admin de la dependencia (sin aprobado_por_id por regla)
    fechaPrestamo: timestamp("fecha_prestamo", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // = misma fecha pedida en la solicitud; nunca anterior a la aprobación
    fechaDevolucion: date("fecha_devolucion").notNull(),
    fechaDevolucionReal: timestamp("fecha_devolucion_real", {
      withTimezone: true,
    }),
    contratoPrestamoUrl: text("contrato_prestamo_url"),
    devuelto: boolean("devuelto").notNull().default(false),
  },
  (table) => [
    // Regla aprobada: un recurso solo prestado a una persona a la vez
    uniqueIndex("prestamos_recurso_activo_uniq")
      .on(table.recursoId)
      .where(sql`${table.devuelto} = false`),
    check(
      "prestamos_fecha_check",
      sql`fecha_devolucion >= fecha_prestamo::date`,
    ),
    index("prestamos_devuelto_idx").on(table.devuelto),
  ],
);

export const notificaciones = pgTable(
  "notificaciones",
  {
    id: serial("id").primaryKey(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: tipoNotificacionEnum("tipo").notNull(),
    mensaje: text("mensaje").notNull(),
    url: varchar("url", { length: 255 }),
    leida: boolean("leida").notNull().default(false),
    fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notificaciones_usuario_leida_fecha_idx").on(
      table.usuarioId,
      table.leida,
      table.fecha,
    ),
  ],
);

export const avisosVencimiento = pgTable(
  "avisos_vencimiento",
  {
    id: serial("id").primaryKey(),
    prestamoId: integer("prestamo_id")
      .notNull()
      .references(() => prestamos.id, { onDelete: "cascade" }),
    // Congela la fecha que originó el aviso: si el admin extiende,
    // la clave cambia y el préstamo genera avisos nuevos correctos.
    fechaDevolucion: date("fecha_devolucion").notNull(),
    diasRestantes: integer("dias_restantes").notNull(),
    enviadoAt: timestamp("enviado_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Idempotencia del cron: un reintento no reenvía (ON CONFLICT DO NOTHING).
    uniqueIndex("avisos_prestamo_fecha_dias_uniq").on(
      table.prestamoId,
      table.fechaDevolucion,
      table.diasRestantes,
    ),
    index("avisos_fecha_idx").on(table.fechaDevolucion),
  ],
);

export const solicitudesPrestamoRelations = relations(
  solicitudesPrestamo,
  ({ one }) => ({
    usuario: one(users, {
      fields: [solicitudesPrestamo.usuarioId],
      references: [users.id],
    }),
    recurso: one(recursos, {
      fields: [solicitudesPrestamo.recursoId],
      references: [recursos.id],
    }),
    // Inverso 1-a-1 de prestamos.solicitudId: el contrato vive en el préstamo.
    prestamo: one(prestamos, {
      fields: [solicitudesPrestamo.id],
      references: [prestamos.solicitudId],
    }),
  }),
);

export const prestamosRelations = relations(prestamos, ({ one }) => ({
  solicitud: one(solicitudesPrestamo, {
    fields: [prestamos.solicitudId],
    references: [solicitudesPrestamo.id],
  }),
  usuario: one(users, {
    fields: [prestamos.usuarioId],
    references: [users.id],
  }),
  recurso: one(recursos, {
    fields: [prestamos.recursoId],
    references: [recursos.id],
  }),
}));

export const notificacionesRelations = relations(notificaciones, ({ one }) => ({
  usuario: one(users, {
    fields: [notificaciones.usuarioId],
    references: [users.id],
  }),
}));

// Lado many() de users: solo tipado para db.query, no altera tablas.
// Se define aquí (y no en auth.ts) para evitar imports circulares.
export const usersRelations = relations(users, ({ one, many }) => ({
  dependenciaAdministrada: one(dependencias, {
    fields: [users.id],
    references: [dependencias.administradorId],
  }),
  solicitudesPrestamo: many(solicitudesPrestamo),
  prestamos: many(prestamos),
  notificaciones: many(notificaciones),
}));
