export default function DashboardLoading() {
  return (
    <div className="rounded-[18px] bg-white/90 px-4 py-8 shadow-[0_10px_35px_rgba(0,0,0,0.08)] sm:px-8 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800" aria-busy="true">
      <div className="mx-auto mb-8 h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="overflow-hidden rounded-[18px] border border-zinc-100 dark:border-zinc-800">
        <div className="h-12 animate-pulse bg-brand-700/80" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse border-t border-zinc-100 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-800/50" />
        ))}
      </div>
    </div>
  );
}
