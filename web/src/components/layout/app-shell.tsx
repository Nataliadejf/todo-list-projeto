"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { TodosProvider } from "@/components/providers/todos-provider";
import { TasksProvider } from "@/components/providers/tasks-provider";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
import { LoginScreen } from "@/components/auth/login-screen";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1120] text-sm text-slate-300">
        Carregando...
      </div>
    );
  }

  if (!user) return <LoginScreen />;

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

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
