"use client";

import {
  BarChart3,
  Calendar,
  RefreshCw,
  Scale,
  Search,
  User,
} from "lucide-react";
import { DEADLINE_OPTIONS, STATUS_OPTIONS, WEIGHT_OPTIONS } from "@/lib/constants";
import { getUniqueValues } from "@/lib/todo-utils";
import { useTodos } from "@/components/providers/todos-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { FadeIn } from "@/components/ui/fade-in";

interface FiltersPanelProps {
  showStatus?: boolean;
  showDeadline?: boolean;
  showArea?: boolean;
  showPeriod?: boolean;
  compact?: boolean;
}

export function FiltersPanel({
  showStatus = true,
  showDeadline = true,
  showArea = false,
  showPeriod = false,
  compact = false,
}: FiltersPanelProps) {
  const { todos, filters, setFilters, clearFilters, refresh, loading } = useTodos();
  const owners = getUniqueValues(todos, "owner");
  const areas = getUniqueValues(todos, "area");

  return (
    <FadeIn>
      <Card className="overflow-hidden">
        <CardContent className={compact ? "space-y-3 p-4" : "space-y-3 p-5"}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Filtros:</p>

          <div className="relative">
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
            <SelectField
              label="Status"
              icon={<BarChart3 className="h-4 w-4" />}
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          ) : null}

          <SelectField
            label="Peso"
            icon={<Scale className="h-4 w-4" />}
            value={filters.weight}
            onChange={(e) => setFilters((prev) => ({ ...prev, weight: e.target.value }))}
          >
            {WEIGHT_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Responsável"
            icon={<User className="h-4 w-4" />}
            value={filters.owner}
            onChange={(e) => setFilters((prev) => ({ ...prev, owner: e.target.value }))}
          >
            <option value="">Todos</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </SelectField>

          {showArea ? (
            <SelectField
              label="Área"
              value={filters.area}
              onChange={(e) => setFilters((prev) => ({ ...prev, area: e.target.value }))}
            >
              <option value="">Todas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </SelectField>
          ) : null}

          {showDeadline ? (
            <SelectField
              label="Prazo"
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
