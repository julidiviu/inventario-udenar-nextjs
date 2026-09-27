import { AdminLoansTable, type AdminLoanRow } from "@/components/ui/AdminLoansTable";
import { PageHeader } from "@/components/ui/PageHeader";

export function AdminOverview({
  rows,
  unassigned,
}: {
  rows: AdminLoanRow[];
  unassigned?: boolean;
}) {
  return (
    <div className="rounded-[20px] bg-white/90 px-4 py-8 shadow-[0_12px_40px_rgba(0,0,0,0.1)] sm:px-8 dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
      <PageHeader title="Panel de Administración" />
      {unassigned ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin dependencia asignada</p>
      ) : (
        <AdminLoansTable rows={rows} />
      )}
    </div>
  );
}
