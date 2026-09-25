import Image from "next/image";
import type { DashboardUser } from "./user";

export function UserPanel({ user }: { user: DashboardUser }) {
  return (
    <div className="flex flex-col items-center px-4 py-6 text-center">
      <div className="relative h-20 w-20 overflow-hidden rounded-full border-[3px] border-emerald-300 shadow-[0_0_15px_rgba(0,255,136,0.5)]">
        {user.fotoUrl ? (
          <Image src={user.fotoUrl} alt={user.fullName} fill sizes="80px" className="object-cover" />
        ) : (
          <span aria-hidden="true" className="grid h-full w-full place-items-center bg-white/15 text-2xl text-white">
            {user.fullName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-bold text-white">{user.fullName}</p>
      <p className="text-xs text-brand-100">{user.rolLabel}</p>
    </div>
  );
}
