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
  { label: "Mi Perfil", href: FUTURE },
  { label: "Inicio", href: "/dashboard" },
];

const adminExtra: NavItem[] = [
  { label: "Inventario", href: FUTURE },
  {
    label: "Solicitudes de Préstamos",
    href: FUTURE,
    children: [
      { label: "Pendientes", href: FUTURE },
      { label: "Aprobadas", href: FUTURE },
      { label: "Rechazadas", href: FUTURE },
      { label: "Todas", href: FUTURE },
    ],
  },
  { label: "Préstamos", href: FUTURE },
  { label: "Estadísticas", href: FUTURE },
];

const prestatarioExtra: NavItem[] = [
  { label: "Solicitar Préstamo", href: FUTURE },
  {
    label: "Mis Solicitudes",
    href: FUTURE,
    children: [
      { label: "Pendientes", href: FUTURE },
      { label: "Aprobadas", href: FUTURE },
      { label: "Rechazadas", href: FUTURE },
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
      return [...comun, { label: "Dependencias", href: FUTURE }];
    default:
      return comun;
  }
}

export function isKnownRol(rol: string): rol is Rol {
  return rol === "admin" || rol === "profesor" || rol === "estudiante" || rol === "superadmin";
}
