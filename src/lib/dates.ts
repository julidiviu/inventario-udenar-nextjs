const TIME_ZONE = "America/Bogota";

const fechaFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** dd/mm/aaaa en hora de Colombia. Acepta Date, string ISO o fecha SQL 'YYYY-MM-DD'. */
export function formatFechaCO(value: Date | string): string {
  const d = toDate(value);
  if (!d) return "—";
  return fechaFmt.format(d);
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
