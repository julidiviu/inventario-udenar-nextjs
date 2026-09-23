import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { rolEnum } from "./enums";

// PK híbrida aprobada: users con uuid, inventario con serial.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: rolEnum("rol").notNull().default("estudiante"),
  cedula: varchar("cedula", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  programa: varchar("programa", { length: 100 }),
  telefono: varchar("telefono", { length: 20 }),
  // URLs de Vercel Blob (nunca binarios en Postgres)
  fotoUrl: text("foto_url"),
  firmaUrl: text("firma_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  // Borrado lógico: deletedAt != null = eliminado
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const dependencias = pgTable("dependencias", {
  id: serial("id").primaryKey(),
  // Código institucional manual (ej. "34"), UNIQUE NOT NULL
  codigo: text("codigo").notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull().unique(),
  descripcion: text("descripcion"),
  imagenUrl: text("imagen_url"),
  // OneToOne: un admin administra máximo una dependencia
  administradorId: uuid("administrador_id")
    .unique()
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const dependenciasRelations = relations(dependencias, ({ one }) => ({
  administrador: one(users, {
    fields: [dependencias.administradorId],
    references: [users.id],
  }),
}));
