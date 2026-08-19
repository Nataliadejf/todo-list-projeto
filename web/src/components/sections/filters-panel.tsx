"use client";

import {
  BarChart3,
  Bell,
  Calendar,
  RefreshCw,
  Ruler,
  Search,
  User,
} from "lucide-react";
import { ALERT_OPTIONS, DEADLINE_OPTIONS, INITIATIVE_STATUS_OPTIONS, TAMANHO_OPTIONS } from "@/lib/constants";
import { getUniqueValues } from "@/lib/todo-utils";
import { useTodos } from "@/components/providers/todos-provider";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { MultiSelect } from "@/components/ui/multi-select";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

interface FiltersPanelProps {
  showStatus?: boolean;
  showDeadline?: boolean;
  showAlert?: boolean;
  showArea?: boolean;
  showSize?: boolean;
  showPeriod?: boolean;
  compact?: boolean;
  layout?: "sidebar" | "horizontal";
}

export function FiltersPanel({
  showStatus = true,
  showDeadline = true,
  showAlert = false,
  showArea = false,
  showSize = true,
  showPeriod = false,
  compact = false,
  layout = "sidebar",
}: FiltersPanelProps) {
  const { todos, filters, setFilters, clearFilters, refresh, loading } = useTodos();
  const { inactiveNames } = useResponsaveis();
  const { isAdmin } = useAuth();
  const owners = getUniqueValues(todos, "owner").filter((o) => !inactiveNames.has(o.trim()));
  const areas = getUniqueValues(todos, "area");
  const isHorizontal = layout === "horizontal";

  const content = (
  <>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Filtros:</p>

      <div
        className={cn(
          isHorizontal
            ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
            : "space-y-3",
        )}
      >
        <div className={cn("relative", isHorizontal && "sm:col-span-2 lg:col-span-2")}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            aria-label="Buscar iniciativas"
          />
        </div>

        {showStatus ? (
          <MultiSelect
            label={isHorizontal ? undefined : "Status"}
            icon={<BarChart3 className="h-4 w-4" />}
            options={INITIATIVE_STATUS_OPTIONS}
            value={filters.status}
            onChange={(v) => setFilters((prev) => ({ ...prev, status: v }))}
            placeholder="Todos"
          />
        ) : null}

        {showSize ? (
          <MultiSelect
            label={isHorizontal ? undefined : "Tamanho"}
            icon={<Ruler className="h-4 w-4" />}
            options={TAMANHO_OPTIONS}
            value={filters.size}
            onChange={(v) => setFilters((prev) => ({ ...prev, size: v }))}
            placeholder="Todos os tamanhos"
          />
        ) : null}

        <MultiSelect
          label={isHorizontal ? undefined : "Responsável"}
          icon={<User className="h-4 w-4" />}
          options={owners}
          value={filters.owner}
          onChange={(v) => setFilters((prev) => ({ ...prev, owner: v }))}
          placeholder="Todos"
        />

        {showArea ? (
          <MultiSelect
            label={isHorizontal ? undefined : "Área"}
            options={areas}
            value={filters.area}
            onChange={(v) => setFilters((prev) => ({ ...prev, area: v }))}
            placeholder="Todas"
          />
        ) : null}

        {showAlert ? (
          <MultiSelect
            label={isHorizontal ? undefined : "Alerta"}
            icon={<Bell className="h-4 w-4" />}
            options={[...ALERT_OPTIONS]}
            value={filters.alert}
            onChange={(v) => setFilters((prev) => ({ ...prev, alert: v }))}
            placeholder="Todos os alertas"
          />
        ) : null}

        {showDeadline ? (
          <SelectField
            label={isHorizontal ? undefined : "Prazo"}
            icon={<Calendar className="h-4 w-4" />}
            value={filters.deadline}
            onChange={(e) => setFilters((prev) => ({ ...prev, deadline: e.target.value }))}
          >
            {DEADLINE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        ) : null}

        {showPeriod ? (
          <>
            <Input
              type="date"
              value={filters.periodStart}
              onChange={(e) => setFilters((prev) => ({ ...prev, periodStart: e.target.value }))}
              aria-label="Período inicial"
            />
            <Input
              type="date"
              value={filters.periodEnd}
              onChange={(e) => setFilters((prev) => ({ ...prev, periodEnd: e.target.value }))}
              aria-label="Período final"
            />
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
          Limpar filtros
        </Button>
        {isAdmin ? (
          <label className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={filters.showInactive}
              onChange={(e) => setFilters((prev) => ({ ...prev, showInactive: e.target.checked }))}
            />
            Mostrar responsáveis inativos
          </label>
        ) : null}
      </div>
  </>
  );

  return (
    <FadeIn>
      <Card className="overflow-visible">
        <CardContent className={cn(compact ? "p-3" : "p-4", isHorizontal ? "space-y-2" : "space-y-3")}>
          {content}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

