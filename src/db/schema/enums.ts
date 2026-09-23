import { pgEnum } from "drizzle-orm/pg-core";

export const rolEnum = pgEnum("rol", [
  "admin",
  "estudiante",
  "profesor",
  "superadmin",
]);

export const estadoSolicitudEnum = pgEnum("estado_solicitud", [
  "pendiente",
  "aprobado",
  "rechazado",
]);

export const tipoNotificacionEnum = pgEnum("tipo_notificacion", [
  "SOLICITUD",
  "APROBADA",
  "RECHAZADA",
  "DEVUELTA",
]);
