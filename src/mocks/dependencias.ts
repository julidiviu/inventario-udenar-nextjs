import type { AdminDisponible, Dependencia } from "@/components/dependencias/types";

/** Mocks solo para vista previa UI-first. No tocan la base de datos. */
export const mockDependencias: Dependencia[] = [
  {
    id: 1,
    codigo: "34",
    nombre: "Ingeniería Civil",
    descripcion:
      "La actual Facultad de Ingeniería se inició en el año de 1971 con el Programa de Ingeniería Civil tomando como base el apoyo ofrecido por el ICFES a las Universidades que crearan Programas de Transferencia.",
    imagenUrl: null,
    administradorId: "11111111-1111-4111-8111-111111111111",
  },
  {
    id: 2,
    codigo: "35",
    nombre: "Ingeniería de Sistemas",
    descripcion:
      "El programa de Ingeniería de Sistemas asume su compromiso de líder y gestor de desarrollo, integrándose a la solución real de los problemas que la región y el país le planteen, de acuerdo con los retos de la contemporaneidad.",
    imagenUrl: null,
    administradorId: null,
  },
  {
    id: 3,
    codigo: "36",
    nombre: "Ingeniería Electrónica",
    descripcion: null,
    imagenUrl: null,
    administradorId: null,
  },
];

/** Solo admins sin dependencia asignada (simulado; en backend será query real). */
export const mockAdminsDisponibles: AdminDisponible[] = [
  { id: "22222222-2222-4222-8222-222222222222", codigo: "770001", nombreCompleto: "Carlos Ruiz" },
  { id: "33333333-3333-4333-8333-333333333333", codigo: "770002", nombreCompleto: "María López" },
];
