export interface DashboardUser {
  fullName: string;
  rol: string;
  rolLabel: string;
  fotoUrl: string | null;
}

export function getRolLabel(rol: string): string {
  switch (rol) {
    case "admin":
      return "Administrador";
    case "profesor":
      return "Profesor";
    case "estudiante":
      return "Estudiante";
    case "superadmin":
      return "Superadmin";
    default:
      return rol;
  }
}

export function getFullName(firstName: string | null, lastName: string | null, codigo: string): string {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || `Usuario ${codigo}`;
}
