"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, Download, Pencil, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/autocomplete";
import { useTasks } from "@/components/providers/tasks-provider";
import { useTodos } from "@/components/providers/todos-provider";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
import { EMPTY_TASK, type Task, type TaskInput } from "@/lib/types";
import { COMPLETED_PERIOD_OPTIONS, TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/constants";
import { downloadTasksCsv } from "@/lib/csv-export";
import { matchesCompletedPeriod } from "@/lib/todo-utils";

function statusVariant(status: string): "default" | "success" | "warning" | "info" {
  if (status === "Concluído") return "success";
  if (status === "Em andamento") return "warning";
  return "info";
}

function priorityVariant(priority: string): "default" | "danger" | "warning" | "info" {
  if (priority === "Alta") return "danger";
  if (priority === "Média") return "warning";
  if (priority === "Baixa") return "info";
  return "default";
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function sameOwner(a?: string, b?: string) {
  return normalize((a ?? "").trim()) === normalize((b ?? "").trim());
}

export function TarefasClient() {
  const { todos } = useTodos();
  const { tasks, loading, error, create, update, remove } = useTasks();
  const { inactiveNames } = useResponsaveis();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<TaskInput>(EMPTY_TASK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterInitiative, setFilterInitiative] = useState<string | null>(searchParams.get("initiativeDbId"));

  // Ao chegar de "ver tarefas" (Portfólio/Iniciativa), já filtra pela iniciativa
  // e pelo responsável da URL.
  useEffect(() => {
    const ini = searchParams.get("initiativeDbId");
    if (ini) setFilterInitiative(ini);
    const own = searchParams.get("owner");
    if (own) setFilterOwner(own);
  }, [searchParams]);
  const [filterOwner, setFilterOwner] = useState<string>(searchParams.get("owner") ?? "");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [completedPeriod, setCompletedPeriod] = useState<string>("");
  const [completedStart, setCompletedStart] = useState<string>("");
  const [completedEnd, setCompletedEnd] = useState<string>("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initiativeLabel = (dbId: number) => {
    const todo = todos.find((t) => t.dbId === dbId);
    return todo ? todo.initiative || todo.id || `Iniciativa ${dbId}` : `#${dbId}`;
  };

  const initiativeName = useMemo(() => {
    const map = new Map<number, string>();
    todos.forEach((todo) => map.set(todo.dbId, todo.initiative || todo.id || `Iniciativa ${todo.dbId}`));
    return map;
  }, [todos]);

  const toOption = (todo: (typeof todos)[number]): AutocompleteOption => {
    const name = todo.initiative || todo.id || `Iniciativa ${todo.dbId}`;
    const parts = [todo.id ? `#${todo.id}` : null, todo.owner?.trim() || null].filter(Boolean);
    return {
      value: String(todo.dbId),
      // id incluído no texto para permitir buscar a iniciativa pelo id (ex.: 234)
      label: name,
      hint: parts.join(" · ") || undefined,
    };
  };

  // Responsáveis inativos (normalizados) para ocultar dos seletores/filtros.
  const inactiveSet = useMemo(
    () => new Set([...inactiveNames].map((n) => normalize(n.trim()))),
    [inactiveNames],
  );

  // Responsáveis conhecidos (donos das iniciativas) — validação de dados,
  // deduplicados por acento/maiúsculas (ex.: "Natália" e "Natalia" viram um só).
  // Responsáveis inativados não aparecem.
  const ownerNames = useMemo(() => {
    const map = new Map<string, string>();
    todos.forEach((todo) => {
      const name = todo.owner?.trim();
      if (!name) return;
      const key = normalize(name);
      if (inactiveSet.has(key)) return;
      if (!map.has(key)) map.set(key, name);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [todos, inactiveSet]);

  const ownerOptions: AutocompleteOption[] = useMemo(
    () => ownerNames.map((o) => ({ value: o, label: o })),
    [ownerNames],
  );

  // A tarefa pode ter responsável diferente da iniciativa — lista todas as iniciativas.
  const formInitiativeOptions = useMemo(
    () => todos.map(toOption),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos],
  );

  // No filtro, idem: escolher o responsável restringe as iniciativas.
  const filterInitiativeOptions = useMemo(
    () => (filterOwner ? todos.filter((t) => sameOwner(t.owner, filterOwner)) : todos).map(toOption),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos, filterOwner],
  );

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return tasks.filter((task) => {
      if (filterInitiative && String(task.initiativeDbId) !== filterInitiative) return false;
      if (filterOwner && !sameOwner(task.owner, filterOwner)) return false;
      if (filterStatus && (task.status || "A fazer") !== filterStatus) return false;
      if (!matchesCompletedPeriod(task.completedAt, { completedPeriod, completedStart, completedEnd })) return false;
      if (q) {
        const iniName = task.initiativeDbId != null ? initiativeName.get(task.initiativeDbId) ?? "" : "";
        const haystack = normalize(`${task.title} ${task.description} ${task.owner} ${iniName}`);
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filterInitiative, filterOwner, filterStatus, completedPeriod, completedStart, completedEnd, search, initiativeName]);

  const resetForm = () => {
    setForm(EMPTY_TASK);
    setEditingId(null);
    setFormError(null);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setForm({
      initiativeDbId: task.initiativeDbId,
      title: task.title,
      description: task.description,
      owner: task.owner,
      status: task.status || "A fazer",
      priority: task.priority,
      dueDate: task.dueDate,
      startDate: task.startDate,
      endDate: task.endDate,
      done: task.done,
    });
    setFormError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Ao chegar de "editar tarefa" (?editTask=ID), abre a tarefa em edição.
  const editTaskParam = searchParams.get("editTask");
  useEffect(() => {
    if (!editTaskParam || tasks.length === 0) return;
    const t = tasks.find((x) => x.id === editTaskParam);
    if (t && editingId !== t.id) startEdit(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTaskParam, tasks]);

  const onSelectInitiative = (value: string | null) => {
    const dbId = value ? Number(value) : null;
    const todo = dbId != null ? todos.find((t) => t.dbId === dbId) : null;
    setForm((prev) => ({
      ...prev,
      initiativeDbId: dbId,
      // apenas sugere o responsável da iniciativa quando ainda não há um definido;
      // a tarefa pode ter responsável diferente.
      owner: prev.owner?.trim() ? prev.owner : (todo?.owner || ""),
    }));
  };

  const onSelectOwner = (value: string | null) => {
    // responsável independente da iniciativa
    setForm((prev) => ({ ...prev, owner: value ?? "" }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError("Informe o título da tarefa.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: TaskInput = { ...form, done: form.status === "Concluído" ? true : form.done };
      if (editingId) await update(editingId, payload);
      else await create(payload);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar tarefa.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (task: Task) => {
    const done = !task.done;
    await update(task.id, {
      initiativeDbId: task.initiativeDbId,
      title: task.title,
      description: task.description,
      owner: task.owner,
      status: done ? "Concluído" : task.status === "Concluído" ? "Em andamento" : task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      startDate: task.startDate,
      endDate: task.endDate,
      done,
    });
  };

  const handleDelete = async (task: Task) => {
    if (typeof window !== "undefined" && !window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    await remove(task.id);
  };

  const clearFilters = () => {
    setFilterInitiative(null);
    setFilterOwner("");
    setFilterStatus("");
    setCompletedPeriod("");
    setCompletedStart("");
    setCompletedEnd("");
    setSearch("");
  };

  const pending = tasks.filter((task) => !task.done).length;
  const hasFilters = Boolean(filterInitiative || filterOwner || filterStatus || completedPeriod || search);

  return (
    <div className="space-y-6">
      <PageHeader title="Tarefas" subtitle={`${tasks.length} tarefas · ${pending} pendentes`} showNewButton={false} />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{editingId ? "Editar tarefa" : "Nova tarefa"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="task-title">Título</Label>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex.: Levantar requisitos"
                  required
                />
              </div>

              <Autocomplete
                label="Responsável"
                placeholder="Selecione o responsável"
                options={ownerOptions}
                value={form.owner || null}
                onChange={onSelectOwner}
                emptyLabel="Nenhum responsável"
              />

              <Autocomplete
                label="Iniciativa vinculada"
                placeholder="Digite para buscar a iniciativa..."
                options={formInitiativeOptions}
                value={form.initiativeDbId != null ? String(form.initiativeDbId) : null}
                onChange={onSelectInitiative}
                emptyLabel="Nenhuma iniciativa encontrada"
              />

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {TASK_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Prioridade"
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  {TASK_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="task-start">Início</Label>
                  <Input
                    id="task-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-end">Término</Label>
                  <Input
                    id="task-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-desc">Descrição</Label>
                <Textarea
                  id="task-desc"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhes da tarefa (opcional)"
                />
              </div>

              {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar tarefa"}
                </Button>
                {editingId ? (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="grid gap-3 py-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px_160px_170px]">
              <div className="space-y-1.5">
                <Label>Buscar tarefas</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Título, descrição, responsável ou iniciativa"
                  />
                </div>
              </div>
              <SelectField
                label="Filtrar por responsável"
                value={filterOwner}
                onChange={(e) => {
                  setFilterOwner(e.target.value);
                  setFilterInitiative(null);
                }}
              >
                <option value="">Todos os responsáveis</option>
                {ownerNames.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </SelectField>
              <Autocomplete
                label="Filtrar por iniciativa"
                placeholder="Todas as iniciativas"
                options={filterInitiativeOptions}
                value={filterInitiative}
                onChange={(value) => setFilterInitiative(value)}
                emptyLabel="Nenhuma iniciativa"
              />
              <SelectField
                label="Filtrar por status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos os status</option>
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Concluídas em"
                value={completedPeriod}
                onChange={(e) => setCompletedPeriod(e.target.value)}
              >
                {COMPLETED_PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectField>
              {completedPeriod === "custom" ? (
                <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-5">
                  <div className="space-y-1.5">
                    <Label>Concluídas a partir de</Label>
                    <Input type="date" value={completedStart} onChange={(e) => setCompletedStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Concluídas até</Label>
                    <Input type="date" value={completedEnd} onChange={(e) => setCompletedEnd(e.target.value)} />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              {filtered.length} de {tasks.length} tarefas
              {hasFilters ? (
                <button type="button" onClick={clearFilters} className="ml-2 text-blue-600 hover:underline">
                  limpar filtros
                </button>
              ) : null}
            </p>
            <Button
              variant="secondary"
              onClick={() => downloadTasksCsv(filtered, initiativeName)}
              disabled={filtered.length === 0}
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {loading ? <p className="text-sm text-slate-500">Carregando tarefas...</p> : null}
          {!loading && filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-500">
                Nenhuma tarefa {hasFilters ? "para os filtros atuais" : "cadastrada"} ainda.
              </CardContent>
            </Card>
          ) : null}

          <ul className="space-y-3">
            {filtered.map((task) => (
              <li key={task.id}>
                <Card>
                  <CardContent className="flex items-start gap-3 py-4">
                    <button
                      type="button"
                      onClick={() => toggleDone(task)}
                      className="mt-0.5 shrink-0 text-slate-400 transition-colors hover:text-emerald-500"
                      aria-label={task.done ? "Marcar como pendente" : "Marcar como concluída"}
                    >
                      {task.done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={task.done ? "font-semibold text-slate-400 line-through" : "font-semibold text-slate-900"}>
                          {task.title}
                        </p>
                        <Badge variant={statusVariant(task.status)}>{task.status || "A fazer"}</Badge>
                        {task.priority ? <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge> : null}
                      </div>

                      {task.description ? <p className="mt-1 text-sm text-slate-500">{task.description}</p> : null}

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {task.initiativeDbId != null ? (
                          <span>
                            Iniciativa:{" "}
                            <span className="font-medium text-slate-700">{initiativeLabel(task.initiativeDbId)}</span>
                          </span>
                        ) : null}
                        {task.owner ? <span>Responsável: {task.owner}</span> : null}
                        {task.startDate ? <span>Início: {task.startDate}</span> : null}
                        {task.endDate ? <span>Término: {task.endDate}</span> : null}
                        {task.dueDate ? <span>Prazo: {task.dueDate}</span> : null}
                        {task.completedAt ? (
                          <span className="text-emerald-600">
                            Concluída em: {new Date(task.completedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(task)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task)}
                        aria-label="Excluir"
                        className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
