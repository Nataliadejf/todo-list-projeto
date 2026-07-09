"use client";

import { useMemo, useState } from "react";
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
import { EMPTY_TASK, type Task, type TaskInput } from "@/lib/types";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/constants";
import { downloadTasksCsv } from "@/lib/csv-export";

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

export function TarefasClient() {
  const { todos } = useTodos();
  const { tasks, loading, error, create, update, remove } = useTasks();

  const [form, setForm] = useState<TaskInput>(EMPTY_TASK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterInitiative, setFilterInitiative] = useState<string | null>(null);
  const [filterOwner, setFilterOwner] = useState<string>("");
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

  const toOption = (todo: (typeof todos)[number]): AutocompleteOption => ({
    value: String(todo.dbId),
    label: todo.initiative || todo.id || `Iniciativa ${todo.dbId}`,
    hint: todo.owner ? `Responsável: ${todo.owner}` : todo.area || undefined,
  });

  // Responsáveis conhecidos (donos das iniciativas) — usados como validação de dados.
  const ownerNames = useMemo(() => {
    const set = new Set<string>();
    todos.forEach((todo) => {
      if (todo.owner?.trim()) set.add(todo.owner.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [todos]);

  const ownerOptions: AutocompleteOption[] = useMemo(
    () => ownerNames.map((o) => ({ value: o, label: o })),
    [ownerNames],
  );

  // No formulário, as iniciativas são filtradas pelo responsável selecionado.
  const formInitiativeOptions = useMemo(
    () => (form.owner ? todos.filter((t) => t.owner?.trim() === form.owner) : todos).map(toOption),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos, form.owner],
  );

  // No filtro, idem: escolher o responsável restringe as iniciativas.
  const filterInitiativeOptions = useMemo(
    () => (filterOwner ? todos.filter((t) => t.owner?.trim() === filterOwner) : todos).map(toOption),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos, filterOwner],
  );

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return tasks.filter((task) => {
      if (filterInitiative && String(task.initiativeDbId) !== filterInitiative) return false;
      if (filterOwner && task.owner !== filterOwner) return false;
      if (q) {
        const iniName = task.initiativeDbId != null ? initiativeName.get(task.initiativeDbId) ?? "" : "";
        const haystack = normalize(`${task.title} ${task.description} ${task.owner} ${iniName}`);
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filterInitiative, filterOwner, search, initiativeName]);

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

  const onSelectInitiative = (value: string | null) => {
    const dbId = value ? Number(value) : null;
    const todo = dbId != null ? todos.find((t) => t.dbId === dbId) : null;
    setForm((prev) => ({
      ...prev,
      initiativeDbId: dbId,
      // vincula o responsável da iniciativa (validação de dados)
      owner: todo?.owner?.trim() ? todo.owner : prev.owner,
    }));
  };

  const onSelectOwner = (value: string | null) => {
    const owner = value ?? "";
    setForm((prev) => {
      // se a iniciativa atual não pertence a esse responsável, limpa o vínculo
      const stillValid =
        prev.initiativeDbId != null &&
        todos.some((t) => t.dbId === prev.initiativeDbId && t.owner?.trim() === owner);
      return { ...prev, owner, initiativeDbId: owner && !stillValid ? null : prev.initiativeDbId };
    });
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
    setSearch("");
  };

  const pending = tasks.filter((task) => !task.done).length;
  const hasFilters = Boolean(filterInitiative || filterOwner || search);

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
                emptyLabel={form.owner ? "Sem iniciativas deste responsável" : "Nenhuma iniciativa encontrada"}
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
            <CardContent className="grid gap-3 py-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_200px]">
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
