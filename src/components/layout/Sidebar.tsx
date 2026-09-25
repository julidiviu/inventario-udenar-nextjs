"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/navigation";

function isFuture(href: string) {
  return href === "#";
}

export function Sidebar({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal" className="mt-2 px-2 pb-6">
      <ul className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = item.href !== "#" && (pathname === item.href || pathname.startsWith(item.href + "/"));
          const disabled = isFuture(item.href) && !item.children;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-disabled={disabled || undefined}
                title={disabled ? "Próximamente" : undefined}
                aria-current={active ? "page" : undefined}
                className={`block rounded-[10px] px-3 py-2 text-sm transition ${
                  active
                    ? "bg-gradient-to-r from-brand-700 to-brand-500 font-bold text-white"
                    : "text-zinc-200 hover:bg-white/10 hover:text-white"
                } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {item.label}
              </Link>
              {item.children && (
                <ul className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/15 pl-3">
                  {item.children.map((child) => (
                    <li key={child.label}>
                      <Link
                        href={child.href}
                        title="Próximamente"
                        aria-disabled="true"
                        className="block cursor-not-allowed rounded-lg px-3 py-1.5 text-[13px] text-zinc-300 opacity-70 transition hover:bg-white/10 hover:text-white"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
