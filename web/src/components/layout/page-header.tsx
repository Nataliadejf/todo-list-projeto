"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUpdatedTime } from "@/lib/todo-utils";
import { useTodos } from "@/components/providers/todos-provider";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showNewButton?: boolean;
}

export function PageHeader({ title, subtitle, showNewButton = true }: PageHeaderProps) {
  const { todos } = useTodos();
  const defaultSubtitle = `${todos.length} iniciativas · atualizado às ${formatUpdatedTime()}`;

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle ?? defaultSubtitle}</p>
      </div>
      {showNewButton ? (
        <Button asChild className="w-full sm:w-auto">
          <Link href="/iniciativas">
            <Plus className="h-4 w-4" />
            Nova Iniciativa
          </Link>
        </Button>
      ) : null}
    </header>
  );
}
