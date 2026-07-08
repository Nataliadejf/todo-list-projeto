import { AppSidebar } from "@/components/layout/app-sidebar";
import { TodosProvider } from "@/components/providers/todos-provider";
import { TasksProvider } from "@/components/providers/tasks-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TodosProvider>
      <TasksProvider>
        <div className="min-h-screen bg-slate-50">
          <AppSidebar />
          <main className="min-h-screen px-4 py-5 sm:px-6 lg:py-8 lg:pl-72 lg:pr-10">{children}</main>
        </div>
      </TasksProvider>
    </TodosProvider>
  );
}
