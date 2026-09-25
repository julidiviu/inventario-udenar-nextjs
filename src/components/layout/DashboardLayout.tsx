import { Brand } from "./Brand";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { UserPanel } from "./UserPanel";
import type { DashboardUser } from "./user";
import type { NavItem } from "@/lib/navigation";
import { DashboardShell } from "./DashboardShell";

export function DashboardLayout({
  user,
  nav,
  children,
}: {
  user: DashboardUser;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      sidebar={
        <div className="flex h-full flex-col bg-brand-700">
          <Brand />
          <UserPanel user={user} />
          <div className="flex-1 overflow-y-auto">
            <Sidebar nav={nav} />
          </div>
        </div>
      }
      footer={<Footer />}
    >
      {children}
    </DashboardShell>
  );
}
