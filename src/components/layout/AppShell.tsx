import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="esm-app-shell">
      <Sidebar />
      <div className="esm-main-shell">
        <Topbar />
        <main className="esm-content">{children}</main>
      </div>
    </div>
  );
}
