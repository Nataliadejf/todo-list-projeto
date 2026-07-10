"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Save, Trash2 } from "lucide-react";
import { EDITABLE_KEYS, LABEL_MAP, MONTH_LABELS } from "@/lib/constants";
import { downloadInitiativesCsv } from "@/lib/csv-export";
import { MONTH_KEYS, type Initiative, type InitiativeInput } from "@/lib/types";
import { getUniqueValues, normalizeInitiative } from "@/lib/todo-utils";
import { useTodos } from "@/components/providers/todos-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FadeIn } from "@/components/ui/fade-in";

const textareaKeys = new Set([
  "description",
  "deliveries",
  "gainDescription",
  "impediment",
  "notes",
]);
const dateKeys = new Set(["startDate", "plannedEndDate", "realEndDate"]);
const numberKeys = new Set([
  "weight",
  "deadlineDays",
  "deadlinePercent",
  "progressPercent",
  "severity",
  "urgency",
  "priority",
  "weightedDelivery",
]);

function emptyInitiative(): InitiativeInput {
  const base = {
    id: "",
    area: "",
    front: "",
    initiative: "",
    owner: "",
    description: "",
    deliveries: "",
    gainCategory: "",
    gainDescription: "",
    size: "",
    weight: "",
    status: "A fazer",
    startDate: "",
    plannedEndDate: "",
    realEndDate: "",
    deadlineDays: "",
    deadlinePercent: "",
    progressPercent: "",
    severity: "",
    urgency: "",
    strategy: "",
    priority: "",
    impediment: "",
    notes: "",
    weightedDelivery: "",
    completed: false,
    approved: false,
    deprioritized: false,
  } as InitiativeInput;
  MONTH_KEYS.forEach((month) => {
    base[month] = false;
  });
  return base;
}

interface InitiativeFormProps {
  editing?: Initiative | null;
  onSaved?: () => void;
  onCancelEdit?: () => void;
}

export function InitiativeForm({ editing, onSaved, onCancelEdit }: InitiativeFormProps) {
  const { todos, create, update, remove } = useTodos();
  const [form, setForm] = useState<InitiativeInput>(emptyInitiative);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        completed: editing.completed,
      });
    } else {
      setForm(emptyInitiative());
    }
  }, [editing]);

  const requiredValid = useMemo(
    () => Boolean(form.id && form.area && form.front && form.initiative && form.owner),
    [form],
  );

  // Valores já cadastrados para validação de dados (padroniza a grafia).
  const owners = useMemo(() => getUniqueValues(todos, "owner"), [todos]);
  const areas = useMemo(() => getUniqueValues(todos, "area"), [todos]);

  function updateField<K extends keyof InitiativeInput>(key: K, value: InitiativeInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!requiredValid) {
      setMessage("Preencha ID, Área, Frente, Iniciativa e Responsável.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = normalizeInitiative(form);
      if (editing?.dbId) {
        await update(editing.dbId, payload);
        setMessage("Iniciativa atualizada com sucesso.");
      } else {
        await create(payload);
        setForm(emptyInitiative());
        setMessage("Iniciativa adicionada com sucesso.");
      }
      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao salvar iniciativa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FadeIn>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{editing ? "Editar iniciativa" : "Cadastro completo de iniciativa"}</CardTitle>
            <p className="text-sm text-slate-500">Todos os campos originais do painel foram preservados.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => downloadInitiativesCsv(todos)}>
            <Download className="h-4 w-4" />
            Baixar planilha (CSV)
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Identificação</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <Field fieldKey="id" value={form.id} onChange={updateField} required />
                <Field fieldKey="area" value={form.area} onChange={updateField} required suggestions={areas} />
                <Field fieldKey="front" value={form.front} onChange={updateField} required />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field fieldKey="initiative" value={form.initiative} onChange={updateField} required />
                <Field fieldKey="owner" value={form.owner} onChange={updateField} required suggestions={owners} />
              </div>
              <Field fieldKey="description" value={form.description} onChange={updateField} />
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Entregas e Ganhos</h3>
              <Field fieldKey="deliveries" value={form.deliveries} onChange={updateField} />
              <div className="grid gap-3 md:grid-cols-3">
                <Field fieldKey="gainCategory" value={form.gainCategory} onChange={updateField} />
                <div className="space-y-1.5">
                  <Label htmlFor="size">{LABEL_MAP.size}</Label>
                  <select
                    id="size"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={form.size}
                    onChange={(e) => updateField("size", e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                  </select>
                </div>
                <Field fieldKey="weight" value={form.weight} onChange={updateField} />
              </div>
              <Field fieldKey="gainDescription" value={form.gainDescription} onChange={updateField} />
              <Field fieldKey="weightedDelivery" value={form.weightedDelivery} onChange={updateField} />
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Status e Prazos</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="status">{LABEL_MAP.status}</Label>
                  <select
                    id="status"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    <option value="A fazer">A fazer</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>
                <Field fieldKey="deadlineDays" value={form.deadlineDays} onChange={updateField} />
                <Field fieldKey="deadlinePercent" value={form.deadlinePercent} onChange={updateField} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field fieldKey="startDate" value={form.startDate} onChange={updateField} />
                <Field fieldKey="plannedEndDate" value={form.plannedEndDate} onChange={updateField} />
                <Field fieldKey="realEndDate" value={form.realEndDate} onChange={updateField} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field fieldKey="progressPercent" value={form.progressPercent} onChange={updateField} />
                <Field fieldKey="severity" value={form.severity} onChange={updateField} />
                <Field fieldKey="urgency" value={form.urgency} onChange={updateField} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field fieldKey="strategy" value={form.strategy} onChange={updateField} />
                <Field fieldKey="priority" value={form.priority} onChange={updateField} />
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Planejamento mensal</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {MONTH_KEYS.map((month) => (
                  <label key={month} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(form[month])}
                      onChange={(e) => updateField(month, e.target.checked)}
                    />
                    {MONTH_LABELS[month]}
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Riscos e observações</h3>
              <Field fieldKey="impediment" value={form.impediment} onChange={updateField} />
              <Field fieldKey="notes" value={form.notes} onChange={updateField} />
            </section>

            {message ? <p className="text-sm text-slate-600">{message}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || !requiredValid}>
                <Save className="h-4 w-4" />
                {editing ? "Salvar alterações" : "Adicionar iniciativa"}
              </Button>
              {editing ? (
                <>
                  <Button type="button" variant="secondary" onClick={onCancelEdit}>
                    Cancelar edição
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void remove(editing.dbId).then(() => onCancelEdit?.())}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

function Field<K extends keyof InitiativeInput>({
  fieldKey,
  value,
  onChange,
  required,
  suggestions,
}: {
  fieldKey: K;
  value: InitiativeInput[K];
  onChange: <T extends keyof InitiativeInput>(key: T, value: InitiativeInput[T]) => void;
  required?: boolean;
  suggestions?: string[];
}) {
  const id = String(fieldKey);
  const label = LABEL_MAP[fieldKey] || fieldKey;

  if (textareaKeys.has(fieldKey)) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          id={id}
          rows={2}
          value={String(value ?? "")}
          onChange={(e) => onChange(fieldKey, e.target.value as InitiativeInput[K])}
          required={required}
        />
      </div>
    );
  }

  const listId = suggestions && suggestions.length > 0 ? `${id}-list` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={dateKeys.has(fieldKey) ? "date" : numberKeys.has(fieldKey) ? "number" : "text"}
        value={String(value ?? "")}
        onChange={(e) => onChange(fieldKey, e.target.value as InitiativeInput[K])}
        required={required}
        list={listId}
        autoComplete={listId ? "off" : undefined}
      />
      {listId ? (
        <datalist id={listId}>
          {suggestions!.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}
