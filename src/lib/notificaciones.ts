/** Página de notificaciones: las últimas N por cursor (keyset sobre id desc). */
export const NOTIFICACIONES_PAGE = 4;

export type TipoNotificacion = "SOLICITUD" | "APROBADA" | "RECHAZADA" | "DEVUELTA" | "EXTENDIDA" | "VENCIMIENTO";

export interface NotificacionItem {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
  fecha: string;
  leida: boolean;
  // Destino explícito por fila (el cron de vencimientos lo usa para
  // diferenciar estudiante/admin); NULL en filas viejas → urlParaTipo.
  url: string | null;
}

export const TIPO_META: Record<TipoNotificacion, { label: string; clases: string }> = {
  SOLICITUD: { label: "Solicitud", clases: "bg-blue-600 text-white" },
  APROBADA: { label: "Aprobada", clases: "bg-green-600 text-white" },
  RECHAZADA: { label: "Rechazada", clases: "bg-red-600 text-white" },
  DEVUELTA: { label: "Devuelta", clases: "bg-zinc-500 text-white" },
  EXTENDIDA: { label: "Extendida", clases: "bg-brand-700 text-white" },
  VENCIMIENTO: { label: "Vencimiento", clases: "bg-amber-500 text-white" },
};

/**
 * Destino al hacer click, derivado del tipo (la columna url queda en NULL).
 * ponytail: APROBADA apunta a mis-solicitudes hasta que exista /mis-prestamos.
 */
export function urlParaTipo(tipo: TipoNotificacion): string | null {
  switch (tipo) {
    case "SOLICITUD":
      return "/solicitudes?estado=pendiente";
    case "RECHAZADA":
      return "/mis-solicitudes?estado=rechazada";
    case "APROBADA":
    case "EXTENDIDA":
      return "/mis-prestamos?estado=pendiente";
    case "DEVUELTA":
      return "/mis-prestamos?estado=devuelto";
    case "VENCIMIENTO":
      // Sin url de fila se asume estudiante; el admin recibe url explícita.
      return "/mis-prestamos?estado=pendiente";
    default:
      return null;
  }
}
