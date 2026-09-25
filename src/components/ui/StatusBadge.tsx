export function StatusBadge({ devuelto }: { devuelto: boolean }) {
  if (devuelto) {
    return (
      <span className="inline-block rounded-[10px] bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white">
        Devuelto
      </span>
    );
  }
  return (
    <span className="inline-block rounded-[10px] bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-900">
      Pendiente
    </span>
  );
}
