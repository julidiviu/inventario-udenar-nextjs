export default function DashboardLoading() {
  return (
    <div className="rounded-[18px] bg-white/90 px-4 py-8 shadow-[0_10px_35px_rgba(0,0,0,0.08)] sm:px-8" aria-busy="true">
      <div className="mx-auto mb-8 h-8 w-64 animate-pulse rounded-lg bg-zinc-200" />
      <div className="overflow-hidden rounded-[18px] border border-zinc-100">
        <div className="h-12 animate-pulse bg-brand-700/80" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse border-t bg-zinc-100/70" />
        ))}
      </div>
    </div>
  );
}
