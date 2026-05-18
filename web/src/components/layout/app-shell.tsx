import { AppSidebar } from "@/components/layout/app-sidebar";
import { TodosProvider } from "@/components/providers/todos-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TodosProvider>
      <div className="min-h-screen bg-slate-50">
        <AppSidebar />
        <main className="min-h-screen px-4 py-5 sm:px-6 lg:pl-64 lg:px-8">{children}</main>
      </div>
    </TodosProvider>
  );
}
