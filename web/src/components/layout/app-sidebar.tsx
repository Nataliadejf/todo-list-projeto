"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, FolderKanban, KeyRound, ListChecks, ListTodo, LogOut, Rocket, ShieldCheck, Target } from "lucide-react";
import { BRAND, NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTodos } from "@/components/providers/todos-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog";

const iconMap = {
  folder: FolderKanban,
  target: Target,
  rocket: Rocket,
  list: ListChecks,
  check: ListTodo,
} as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { connected, error, databaseType, databasePersistent } = useTodos();
  const { user, isAdmin, logout } = useAuth();
  const [showChangePwd, setShowChangePwd] = useState(false);

  // Visão Executiva é restrita aos administradores.
  const navItems = NAV_ITEMS.filter((item) => item.href !== "/executivo" || isAdmin);

  return (
    <aside className="flex w-full shrink-0 flex-col bg-[#0b1120] text-slate-200 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {BRAND.name} • {BRAND.subtitle}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{BRAND.appTitle}</h1>
        <p className="mt-1 text-xs text-slate-400">
          {databaseType === "postgres"
            ? "PostgreSQL (persistente)"
            : databasePersistent
              ? "SQLite (disco persistente)"
              : "SQLite (somente nesta máquina)"}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4" aria-label="Navegação principal">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Navegação</p>
        <ul className="mt-3 space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-500/20 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      item.icon === "folder" && "text-amber-300",
                      item.icon === "rocket" && "text-pink-300",
                    )}
                  />
                  {item.label}
                  {item.href === "/portfolio" && active ? (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400" />
                  ) : null}
                </Link>
              </li>
            );
          })}
          {isAdmin ? (
            <li>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === "/admin" || pathname.startsWith("/admin/")
                    ? "bg-blue-500/20 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <ShieldCheck className="h-4 w-4 text-sky-300" />
                Administração
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>

      {user ? (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="truncate text-sm font-medium text-white">{user.name || user.email}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setShowChangePwd(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Alterar senha
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      ) : null}

      {showChangePwd ? <ChangePasswordDialog onClose={() => setShowChangePwd(false)} /> : null}

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-slate-500">{BRAND.version}</p>
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
            connected ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-400" : "bg-rose-400")} />
          {connected
            ? databasePersistent
              ? "Banco persistente"
              : "Conectado (dados podem sumir)"
            : error
              ? "Erro de conexão"
              : "Conectando..."}
        </div>
      </div>
    </aside>
  );
}
