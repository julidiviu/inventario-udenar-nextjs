import Link from "next/link";

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 bg-brand-700 px-4 py-3 transition hover:bg-brand-500">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-lg text-brand-100"
      >
        ✎
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-bold tracking-wide text-white">Sistema de Préstamos</span>
        <span className="text-xs text-brand-100/85">Recursos educativos</span>
      </span>
    </Link>
  );
}
