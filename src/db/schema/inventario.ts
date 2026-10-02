import {
  boolean,
  check,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { dependencias } from "./auth";

export const tiposRecurso = pgTable(
  "tipos_recurso",
  {
    id: serial("id").primaryKey(),
    nombre: varchar("nombre", { length: 255 }).notNull(),
    dependenciaId: integer("dependencia_id")
      .notNull()
      .references(() => dependencias.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("tipos_recurso_nombre_dependencia_uniq").on(
      table.nombre,
      table.dependenciaId,
    ),
  ],
);

export const recursos = pgTable(
  "recursos",
  {
  id: serial("id").primaryKey(),
  // QR institucional manual, obligatorio y UNIQUE (no es PK)
  qr: text("qr").notNull().unique(),
  tipoId: integer("tipo_id")
    .notNull()
    .references(() => tiposRecurso.id, { onDelete: "restrict" }),
  // SIN dependencia_id: se obtiene vía tipoRecurso.dependenciaId (regla aprobada)
  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion").notNull(),
  fotoUrl: text("foto_url"),
  // 1-a-1 aprobado: una fila = una unidad física
  disponible: boolean("disponible").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
},
  (table) => [
    // QR de negocio: string numérico de máximo 8 dígitos (espejo de QR_RE en app).
    // Borrado físico aprobado: el UNIQUE global no bloquea reutilización.
    check("recursos_qr_check", sql`${table.qr} ~ '^[0-9]{1,8}$'`),
  ],
);

export const tiposRecursoRelations = relations(tiposRecurso, ({ one, many }) => ({
  dependencia: one(dependencias, {
    fields: [tiposRecurso.dependenciaId],
    references: [dependencias.id],
  }),
  recursos: many(recursos),
}));

export const recursosRelations = relations(recursos, ({ one }) => ({
  tipo: one(tiposRecurso, {
    fields: [recursos.tipoId],
    references: [tiposRecurso.id],
  }),
}));
