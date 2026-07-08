"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/components/providers/tasks-provider";
import { useTodos } from "@/components/providers/todos-provider";
import { EMPTY_TASK, type Task, type TaskInput } from "@/lib/types";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/constants";

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

export function TarefasClient() {
  const { todos } = useTodos();
  const { tasks, loading, error, create, update, remove } = useTasks();

  const [form, setForm] = useState<TaskInput>(EMPTY_TASK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterInitiative, setFilterInitiative] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initiativeName = useMemo(() => {
    const map = new Map<number, string>();
    todos.forEach((todo) => {
      map.set(todo.dbId, todo.initiative || todo.id || `Iniciativa ${todo.dbId}`);
    });
    return map;
  }, [todos]);

  const filtered = useMemo(() => {
    if (!filterInitiative) return tasks;
    return tasks.filter((task) => String(task.initiativeDbId) === filterInitiative);
  }, [tasks, filterInitiative]);

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
      done: task.done,
    });
    setFormError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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
      const payload: TaskInput = {
        ...form,
        done: form.status === "Concluído" ? true : form.done,
      };
      if (editingId) {
        await update(editingId, payload);
      } else {
        await create(payload);
      }
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
      done,
    });
  };

  const handleDelete = async (task: Task) => {
    if (typeof window !== "undefined" && !window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    await remove(task.id);
  };

  const pending = tasks.filter((task) => !task.done).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas"
        subtitle={`${tasks.length} tarefas · ${pending} pendentes`}
        showNewButton={false}
      />

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

              <SelectField
                label="Iniciativa vinculada"
                value={form.initiativeDbId != null ? String(form.initiativeDbId) : ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    initiativeDbId: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              >
                <option value="">Sem vínculo</option>
                {todos.map((todo) => (
                  <option key={todo.dbId} value={todo.dbId}>
                    {todo.initiative || todo.id || `Iniciativa ${todo.dbId}`}
                  </option>
                ))}
              </SelectField>

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
                  <Label htmlFor="task-owner">Responsável</Label>
                  <Input
                    id="task-owner"
                    value={form.owner}
                    onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
                    placeholder="Nome"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-due">Prazo</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <SelectField
                label="Filtrar por iniciativa"
                value={filterInitiative}
                onChange={(e) => setFilterInitiative(e.target.value)}
              >
                <option value="">Todas as iniciativas</option>
                {todos.map((todo) => (
                  <option key={todo.dbId} value={todo.dbId}>
                    {todo.initiative || todo.id || `Iniciativa ${todo.dbId}`}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {loading ? <p className="text-sm text-slate-500">Carregando tarefas...</p> : null}
          {!loading && filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-500">
                Nenhuma tarefa {filterInitiative ? "para esta iniciativa" : "cadastrada"} ainda.
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
                        <p
                          className={
                            task.done
                              ? "font-semibold text-slate-400 line-through"
                              : "font-semibold text-slate-900"
                          }
                        >
                          {task.title}
                        </p>
                        <Badge variant={statusVariant(task.status)}>{task.status || "A fazer"}</Badge>
                        {task.priority ? (
                          <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                        ) : null}
                      </div>

                      {task.description ? (
                        <p className="mt-1 text-sm text-slate-500">{task.description}</p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {task.initiativeDbId != null ? (
                          <span>
                            Iniciativa:{" "}
                            <span className="font-medium text-slate-700">
                              {initiativeName.get(task.initiativeDbId) ?? `#${task.initiativeDbId}`}
                            </span>
                          </span>
                        ) : null}
                        {task.owner ? <span>Responsável: {task.owner}</span> : null}
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
