"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { NavItem } from "@/lib/navigation";

function isFuture(href: string) {
  return href === "#";
}

function basePath(href: string) {
  return href.split("?")[0];
}

export function Sidebar({ nav }: { nav: NavItem[] }) {
  return (
    <Suspense>
      <SidebarInner nav={nav} />
    </Suspense>
  );
}

function SidebarInner({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const estado = searchParams.get("estado");

  return (
    <nav aria-label="Navegación principal" className="mt-2 px-2 pb-6">
      <ul className="flex flex-col gap-1">
        {nav.map((item) => {
          const futureParent = isFuture(item.href);
          const parentActive =
            !futureParent && (pathname === basePath(item.href) || pathname.startsWith(`${basePath(item.href)}/`));
          const disabled = futureParent && !item.children;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-disabled={disabled || undefined}
                title={disabled ? "Próximamente" : undefined}
                aria-current={parentActive ? "page" : undefined}
                className={`block rounded-[10px] px-3 py-2 text-sm transition ${
                  parentActive
                    ? "bg-gradient-to-r from-brand-700 to-brand-500 font-bold text-white"
                    : "text-zinc-200 hover:bg-white/10 hover:text-white"
                } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {item.label}
              </Link>
              {item.children && (
                <ul className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/15 pl-3">
                  {item.children.map((child) => {
                    const future = isFuture(child.href);
                    const childActive =
                      !future &&
                      pathname === basePath(child.href) &&
                      new URLSearchParams(child.href.split("?")[1] ?? "").get("estado") === estado;
                    return (
                      <li key={child.label}>
                        <Link
                          href={child.href}
                          title={future ? "Próximamente" : undefined}
                          aria-disabled={future || undefined}
                          aria-current={childActive ? "page" : undefined}
                          className={`block rounded-lg px-3 py-1.5 text-[13px] transition ${
                            childActive
                              ? "bg-white/20 font-bold text-white"
                              : "text-zinc-300 hover:bg-white/10 hover:text-white"
                          } ${future ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
