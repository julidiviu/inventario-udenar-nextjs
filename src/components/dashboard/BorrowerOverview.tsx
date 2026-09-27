import { LoansTable, type BorrowerLoanRow } from "@/components/ui/LoansTable";
import { PageHeader } from "@/components/ui/PageHeader";

export function BorrowerOverview({ title, rows }: { title: string; rows: BorrowerLoanRow[] }) {
  return (
    <div className="rounded-[18px] bg-white/90 px-4 py-8 shadow-[0_10px_35px_rgba(0,0,0,0.08)] sm:px-8 dark:bg-zinc-900 dark:shadow-none dark:ring-1 dark:ring-zinc-800">
      <PageHeader title={title} />
      <LoansTable rows={rows} />
    </div>
  );
}
