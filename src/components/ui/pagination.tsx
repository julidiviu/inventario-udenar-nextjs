import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn("flex flex-row flex-wrap items-center justify-center gap-1", className)}
      {...props}
    />
  ),
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("", className)} {...props} />
  ),
);
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
  /** true para envolver next/link (navegación SPA, conserva el tema). */
  asChild?: boolean;
} & React.ComponentProps<"a">;

const PaginationLink = ({ className, isActive, asChild = false, ...props }: PaginationLinkProps) => {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-[10px] px-2 text-sm font-semibold transition",
        isActive
          ? "bg-brand-700 text-white"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
        className,
      )}
      {...props}
    />
  );
};
PaginationLink.displayName = "PaginationLink";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden="true" className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">Más páginas</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink };
