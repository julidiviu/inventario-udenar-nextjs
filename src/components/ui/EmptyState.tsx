import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  message,
  variant = "plain",
}: {
  message: string;
  variant?: "plain" | "alert";
}) {
  if (variant === "alert") {
    return (
      <div className="rounded-[14px] border-l-6 border-brand-700 bg-white px-8 py-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:bg-zinc-900">
        <Info className="mx-auto mb-2 size-7 text-brand-700 dark:text-brand-100" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{message}</p>
      </div>
    );
  }
  return <p className={cn("px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400")}>{message}</p>;
}
