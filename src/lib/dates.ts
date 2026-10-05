const TIME_ZONE = "America/Bogota";

const fechaFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const horaFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** dd/mm/aaaa en hora de Colombia. Acepta Date, string ISO o fecha SQL 'YYYY-MM-DD'. */
export function formatFechaCO(value: Date | string): string {
  const d = toDate(value);
  if (!d) return "—";
  return fechaFmt.format(d);
}

/** dd/mm/aaaa hh:mm PM|AM en hora de Colombia (ej. 03/10/2026 02:45 PM). */
export function formatFechaHoraCO(value: Date | string): string {
  const d = toDate(value);
  if (!d) return "—";
  // es-CO 12h emite "02:45 p. m." → normaliza a "02:45 PM".
  const hora = horaFmt.format(d).replace(/([ap])\.\s*m\./i, (_, p: string) => `${p.toUpperCase()}M`);
  return `${fechaFmt.format(d)} ${hora}`;
}

function toDate(value: Date | string): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  // date SQL 'YYYY-MM-DD' → mediodía UTC para evitar desfase de día al convertir a Bogotá.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T12:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
