import type { AdminLoanRow } from "@/components/ui/AdminLoansTable";
import type { BorrowerLoanRow } from "@/components/ui/LoansTable";

/**
 * Mocks solo para vista previa del dashboard en desarrollo.
 * Se activan con MOCK_DASHBOARD=1 en .env.local (nunca en producción).
 * No tocan la base de datos.
 */

export const mockBorrowerLoans: BorrowerLoanRow[] = [
  { recursoId: 101, recursoNombre: "Portátil Lenovo ThinkPad", dependenciaNombre: "Sistemas", fechaPrestamo: "2026-09-20T14:30:00Z", fechaDevolucion: "2026-09-27", devuelto: false },
  { recursoId: 102, recursoNombre: "Proyector Epson X41", dependenciaNombre: "Audiovisuales", fechaPrestamo: "2026-09-18T09:00:00Z", fechaDevolucion: "2026-09-25", devuelto: false },
  { recursoId: 103, recursoNombre: "Multímetro Fluke 117", dependenciaNombre: "Laboratorio Electrónica", fechaPrestamo: "2026-09-15T16:00:00Z", fechaDevolucion: "2026-09-22", devuelto: true },
  { recursoId: 104, recursoNombre: "Cámara Canon EOS Rebel", dependenciaNombre: "Audiovisuales", fechaPrestamo: "2026-09-10T10:15:00Z", fechaDevolucion: "2026-09-17", devuelto: true },
  { recursoId: 105, recursoNombre: "Taladro Bosch GSB 13", dependenciaNombre: "Taller Industrial", fechaPrestamo: "2026-09-05T08:00:00Z", fechaDevolucion: "2026-09-12", devuelto: true },
  { recursoId: 106, recursoNombre: "Microscopio Olympus CX23", dependenciaNombre: "Laboratorio Biología", fechaPrestamo: "2026-08-28T11:00:00Z", fechaDevolucion: "2026-09-04", devuelto: true },
  { recursoId: 107, recursoNombre: "Parlante JBL PartyBox", dependenciaNombre: "Bienestar", fechaPrestamo: "2026-08-20T15:45:00Z", fechaDevolucion: "2026-08-27", devuelto: true },
  { recursoId: 108, recursoNombre: "Tablet Samsung Galaxy Tab", dependenciaNombre: "Sistemas", fechaPrestamo: "2026-08-12T09:30:00Z", fechaDevolucion: "2026-08-19", devuelto: true },
  { recursoId: 109, recursoNombre: "Osciloscopio Rigol DS1054Z", dependenciaNombre: "Laboratorio Electrónica", fechaPrestamo: "2026-08-01T13:00:00Z", fechaDevolucion: "2026-08-08", devuelto: true },
  { recursoId: 110, recursoNombre: "Kit Arduino Uno R3", dependenciaNombre: "Laboratorio Electrónica", fechaPrestamo: "2026-07-22T10:00:00Z", fechaDevolucion: "2026-07-29", devuelto: true },
];

export const mockAdminLoans: AdminLoanRow[] = [
  { recursoId: 101, recursoNombre: "Portátil Lenovo ThinkPad", usuarioNombre: "Ana Martínez", fechaPrestamo: "2026-09-20T14:30:00Z", fechaDevolucion: "2026-09-27", devuelto: false, contratoUrl: "https://example.com/contratos/101.pdf" },
  { recursoId: 112, recursoNombre: "Portátil HP ProBook", usuarioNombre: "Carlos Ruiz", fechaPrestamo: "2026-09-19T08:15:00Z", fechaDevolucion: "2026-09-26", devuelto: false, contratoUrl: null },
  { recursoId: 113, recursoNombre: "Monitor LG 24\"", usuarioNombre: "Lucía Fernández", fechaPrestamo: "2026-09-17T11:00:00Z", fechaDevolucion: "2026-09-24", devuelto: false, contratoUrl: "https://example.com/contratos/113.pdf" },
  { recursoId: 114, recursoNombre: "Teclado mecánico Logitech", usuarioNombre: "Diego Torres", fechaPrestamo: "2026-09-14T16:20:00Z", fechaDevolucion: "2026-09-21", devuelto: true, contratoUrl: "https://example.com/contratos/114.pdf" },
  { recursoId: 115, recursoNombre: "Mouse inalámbrico", usuarioNombre: "Sofía Herrera", fechaPrestamo: "2026-09-11T09:05:00Z", fechaDevolucion: "2026-09-18", devuelto: true, contratoUrl: null },
  { recursoId: 116, recursoNombre: "Disco SSD 1TB", usuarioNombre: "Pedro Gómez", fechaPrestamo: "2026-09-08T13:40:00Z", fechaDevolucion: "2026-09-15", devuelto: true, contratoUrl: "https://example.com/contratos/116.pdf" },
  { recursoId: 117, recursoNombre: "Memoria RAM 16GB", usuarioNombre: "María López", fechaPrestamo: "2026-09-03T10:00:00Z", fechaDevolucion: "2026-09-10", devuelto: true, contratoUrl: null },
  { recursoId: 118, recursoNombre: "Switch TP-Link 8 puertos", usuarioNombre: "Jorge Ramírez", fechaPrestamo: "2026-08-29T15:00:00Z", fechaDevolucion: "2026-09-05", devuelto: true, contratoUrl: "https://example.com/contratos/118.pdf" },
  { recursoId: 119, recursoNombre: "Router Cisco RV160", usuarioNombre: "Elena Castro", fechaPrestamo: "2026-08-24T08:30:00Z", fechaDevolucion: "2026-08-31", devuelto: true, contratoUrl: "https://example.com/contratos/119.pdf" },
  { recursoId: 120, recursoNombre: "Impresora HP LaserJet", usuarioNombre: "Andrés Peña", fechaPrestamo: "2026-08-18T12:00:00Z", fechaDevolucion: "2026-08-25", devuelto: true, contratoUrl: null },
];

/** Vista global del superadmin: mezcla dependencias. */
export const mockSuperadminLoans: AdminLoanRow[] = [
  { recursoId: 101, recursoNombre: "Portátil Lenovo ThinkPad", usuarioNombre: "Ana Martínez", fechaPrestamo: "2026-09-20T14:30:00Z", fechaDevolucion: "2026-09-27", devuelto: false, contratoUrl: "https://example.com/contratos/101.pdf" },
  { recursoId: 201, recursoNombre: "Proyector Epson X41", usuarioNombre: "Carlos Ruiz", fechaPrestamo: "2026-09-19T17:00:00Z", fechaDevolucion: "2026-09-26", devuelto: false, contratoUrl: null },
  { recursoId: 301, recursoNombre: "Microscopio Olympus CX23", usuarioNombre: "Lucía Fernández", fechaPrestamo: "2026-09-18T09:00:00Z", fechaDevolucion: "2026-09-25", devuelto: false, contratoUrl: "https://example.com/contratos/301.pdf" },
  { recursoId: 401, recursoNombre: "Taladro Bosch GSB 13", usuarioNombre: "Diego Torres", fechaPrestamo: "2026-09-16T07:45:00Z", fechaDevolucion: "2026-09-23", devuelto: true, contratoUrl: null },
  { recursoId: 102, recursoNombre: "Proyector Epson X41", usuarioNombre: "Sofía Herrera", fechaPrestamo: "2026-09-15T14:00:00Z", fechaDevolucion: "2026-09-22", devuelto: true, contratoUrl: "https://example.com/contratos/102.pdf" },
  { recursoId: 302, recursoNombre: "Centrífuga Eppendorf", usuarioNombre: "Pedro Gómez", fechaPrestamo: "2026-09-12T10:30:00Z", fechaDevolucion: "2026-09-19", devuelto: true, contratoUrl: "https://example.com/contratos/302.pdf" },
  { recursoId: 202, recursoNombre: "Cámara Canon EOS Rebel", usuarioNombre: "María López", fechaPrestamo: "2026-09-09T11:15:00Z", fechaDevolucion: "2026-09-16", devuelto: true, contratoUrl: null },
  { recursoId: 402, recursoNombre: "Soldador Weller 40W", usuarioNombre: "Jorge Ramírez", fechaPrestamo: "2026-09-04T08:00:00Z", fechaDevolucion: "2026-09-11", devuelto: true, contratoUrl: "https://example.com/contratos/402.pdf" },
  { recursoId: 203, recursoNombre: "Trípode Manfrotto", usuarioNombre: "Elena Castro", fechaPrestamo: "2026-08-30T16:00:00Z", fechaDevolucion: "2026-09-06", devuelto: true, contratoUrl: null },
  { recursoId: 303, recursoNombre: "Balanza analítica", usuarioNombre: "Andrés Peña", fechaPrestamo: "2026-08-25T09:20:00Z", fechaDevolucion: "2026-09-01", devuelto: true, contratoUrl: "https://example.com/contratos/303.pdf" },
];
