"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { hrefConParams } from "@/lib/paginacion";

interface PaginadorProps {
  /** Vacío en módulos sin filtro de estado (usuarios): se omite de la URL. */
  estado?: string;
  q: string;
  pagina: number;
  totalPaginas: number;
}

/** Números con elipsis: 1 … actual±1 … última (todo si ≤ 7). */
function items(pagina: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = new Set([1, 2, pagina - 1, pagina, pagina + 1, total - 1, total]);
  const ordenados = [...nums].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of ordenados) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

/**
 * Paginador compartido (solicitudes y préstamos). Solo aparece con 2+ páginas.
 * Links con next/link: navegación SPA sin recarga (conserva el tema).
 */
export function Paginador({ estado = "", q, pagina, totalPaginas }: PaginadorProps) {
  const pathname = usePathname();
  if (totalPaginas <= 1) return null;
  const url = (p: number) => hrefConParams(pathname, { estado, pagina: p, q });

  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          {pagina > 1 ? (
            <PaginationLink asChild>
              <Link href={url(pagina - 1)} aria-label="Ir a la página anterior">
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </Link>
            </PaginationLink>
          ) : (
            <PaginationLink aria-disabled="true" className="pointer-events-none opacity-50">
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </PaginationLink>
          )}
        </PaginationItem>
        {items(pagina, totalPaginas).map((it, i) =>
          it === "…" ? (
            <PaginationItem key={`e-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={it}>
              <PaginationLink asChild isActive={it === pagina}>
                <Link href={url(it)}>{it}</Link>
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          {pagina < totalPaginas ? (
            <PaginationLink asChild>
              <Link href={url(pagina + 1)} aria-label="Ir a la página siguiente">
                <span>Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </PaginationLink>
          ) : (
            <PaginationLink aria-disabled="true" className="pointer-events-none opacity-50">
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </PaginationLink>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
