/** Filas por página (fijo, predecible en cualquier pantalla). */
export const FILAS_POR_PAGINA = 15;

/** Normaliza ?pagina=. Default 1, mínimo 1. */
export function parsePagina(raw: unknown): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Normaliza ?q=. Trim + tope 100 caracteres. "" = sin búsqueda. */
export function parseQuery(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, 100) : "";
}

/** Escapa %, _ y \ para usar el texto en un patrón ilike (escape por defecto: \). */
export function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** offset de la página (ya validada/clampada). */
export function paginaOffset(pagina: number): number {
  return (pagina - 1) * FILAS_POR_PAGINA;
}

interface PaginaParams {
  estado: string;
  pagina: number;
  q: string;
}

/** Normaliza ?destacar=. Id positivo o null (ids inválidos se ignoran en silencio). */
export function parseDestacar(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** URL canónica: siempre estado, q solo si hay búsqueda, pagina solo si > 1. */
export function hrefConParams(base: string, { estado, pagina, q }: PaginaParams): string {
  const sp = new URLSearchParams();
  sp.set("estado", estado);
  if (q) sp.set("q", q);
  if (pagina > 1) sp.set("pagina", String(pagina));
  return `${base}?${sp}`;
}
