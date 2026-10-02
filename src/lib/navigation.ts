export type Rol = "admin" | "profesor" | "estudiante" | "superadmin";

export interface NavChild {
  label: string;
  /** "#" = módulo futuro, href real se define al construir ese módulo. */
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavChild[];
}

// Paridad visual con base.html. Solo /dashboard navega en fase dashboard;
// el resto es href="#" y se cablea al construir cada módulo.
const FUTURE = "#";

const comun: NavItem[] = [
  { label: "Mi Perfil", href: "/perfil" },
  { label: "Inicio", href: "/dashboard" },
];

const adminExtra: NavItem[] = [
  { label: "Inventario", href: "/inventario" },
  {
    label: "Solicitudes de Préstamos",
    href: "/solicitudes?estado=todas",
    children: [
      { label: "Pendientes", href: "/solicitudes?estado=pendiente" },
      { label: "Aprobadas", href: "/solicitudes?estado=aprobada" },
      { label: "Rechazadas", href: "/solicitudes?estado=rechazada" },
    ],
  },
  { label: "Préstamos", href: FUTURE },
  { label: "Estadísticas", href: FUTURE },
];

const prestatarioExtra: NavItem[] = [
  // UI-first: el flujo de solicitud inicia en el grid de dependencias (modo lectura).
  { label: "Solicitar Préstamo", href: "/dependencias" },
  {
    label: "Mis Solicitudes",
    href: "/mis-solicitudes?estado=todas",
    children: [
      { label: "Pendientes", href: "/mis-solicitudes?estado=pendiente" },
      { label: "Aprobadas", href: "/mis-solicitudes?estado=aprobada" },
      { label: "Rechazadas", href: "/mis-solicitudes?estado=rechazada" },
    ],
  },
  { label: "Mis Préstamos", href: FUTURE },
];

export function getNavByRole(rol: Rol): NavItem[] {
  switch (rol) {
    case "admin":
      return [...comun, ...adminExtra];
    case "profesor":
    case "estudiante":
      return [...comun, ...prestatarioExtra];
    case "superadmin":
      // Mínimo aprobado: Dashboard + Dependencias.
      return [...comun, { label: "Dependencias", href: "/dependencias" }];
    default:
      return comun;
  }
}

export function isKnownRol(rol: string): rol is Rol {
  return rol === "admin" || rol === "profesor" || rol === "estudiante" || rol === "superadmin";
}
