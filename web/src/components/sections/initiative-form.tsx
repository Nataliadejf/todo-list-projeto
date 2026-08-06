"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Save, Trash2 } from "lucide-react";
import {
  AREA_OPTIONS,
  CATEGORIA_GANHO_OPTIONS,
  GUT_OPTIONS,
  INITIATIVE_STATUS_OPTIONS,
  LABEL_MAP,
  MONTH_LABELS,
  SIM_NAO_OPTIONS,
  TAMANHO_OPTIONS,
} from "@/lib/constants";
import { useResponsaveis } from "@/components/providers/responsaveis-provider";
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
  "efficacyIndicator",
  "notes",
]);
const dateKeys = new Set(["startDate", "plannedEndDate", "realEndDate"]);
const numberKeys = new Set([
  "progressPercent",
  "priority",
]);

function emptyInitiative(): InitiativeInput {
  const base = {
    id: "",
    area: "",
    front: "",
    initiative: "",
    owner: "",
    backup: "",
    efficacyIndicator: "",
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
  const { responsaveis } = useResponsaveis();
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
    () =>
      Boolean(
        form.id && form.area && form.front && form.initiative && form.owner &&
        form.gainCategory && form.size && form.status,
      ),
    [form],
  );

  // Frentes já cadastradas (lista com sugestões — a V4 tem valores variados).
  const frentes = useMemo(() => getUniqueValues(todos, "front"), [todos]);

  // Prazo (dias) calculado automaticamente a partir das datas.
  useEffect(() => {
    const start = form.startDate ? new Date(form.startDate) : null;
    const end = form.plannedEndDate ? new Date(form.plannedEndDate) : null;
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const value = String(days);
      setForm((prev) => (prev.deadlineDays === value ? prev : { ...prev, deadlineDays: value }));
    }
  }, [form.startDate, form.plannedEndDate]);

  function updateField<K extends keyof InitiativeInput>(key: K, value: InitiativeInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!requiredValid) {
      setMessage("Preencha os campos obrigatórios (*): ID, Área, Frente, Iniciativa, Responsável, Categoria Ganho, Tam e Status.");
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
                <Field fieldKey="area" value={form.area} onChange={updateField} required options={AREA_OPTIONS} />
                <Field fieldKey="front" value={form.front} onChange={updateField} required suggestions={frentes} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field fieldKey="initiative" value={form.initiative} onChange={updateField} required />
                <Field fieldKey="owner" value={form.owner} onChange={updateField} required options={responsaveis} />
                <Field fieldKey="backup" value={form.backup} onChange={updateField} options={responsaveis} />
              </div>
              <Field fieldKey="description" value={form.description} onChange={updateField} />
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Entregas e Ganhos</h3>
              <Field fieldKey="deliveries" value={form.deliveries} onChange={updateField} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field fieldKey="gainCategory" value={form.gainCategory} onChange={updateField} required options={CATEGORIA_GANHO_OPTIONS} />
                <Field fieldKey="size" value={form.size} onChange={updateField} required options={TAMANHO_OPTIONS} />
              </div>
              <Field fieldKey="gainDescription" value={form.gainDescription} onChange={updateField} />
              <Field fieldKey="efficacyIndicator" value={form.efficacyIndicator} onChange={updateField} />
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-800">Status e Prazos</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <Field fieldKey="status" value={form.status} onChange={updateField} required options={INITIATIVE_STATUS_OPTIONS} />
                <Field fieldKey="startDate" value={form.startDate} onChange={updateField} />
                <Field fieldKey="plannedEndDate" value={form.plannedEndDate} onChange={updateField} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field fieldKey="deadlineDays" value={form.deadlineDays} onChange={updateField} readOnly hint="Calculado: Data Fim − Data Início" />
                <Field fieldKey="realEndDate" value={form.realEndDate} onChange={updateField} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field fieldKey="progressPercent" value={form.progressPercent} onChange={updateField} />
                <Field fieldKey="severity" value={form.severity} onChange={updateField} options={GUT_OPTIONS} />
                <Field fieldKey="urgency" value={form.urgency} onChange={updateField} options={GUT_OPTIONS} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field fieldKey="strategy" value={form.strategy} onChange={updateField} options={SIM_NAO_OPTIONS} />
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
              <Field fieldKey="impediment" value={form.impediment} onChange={updateField} options={SIM_NAO_OPTIONS} />
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
  options,
  readOnly,
  hint,
}: {
  fieldKey: K;
  value: InitiativeInput[K];
  onChange: <T extends keyof InitiativeInput>(key: T, value: InitiativeInput[T]) => void;
  required?: boolean;
  suggestions?: readonly string[];
  options?: readonly string[];
  readOnly?: boolean;
  hint?: string;
}) {
  const id = String(fieldKey);
  const label = (LABEL_MAP[fieldKey] || fieldKey) + (required ? " *" : "");
  const current = String(value ?? "");

  if (textareaKeys.has(fieldKey)) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          id={id}
          rows={2}
          value={current}
          onChange={(e) => onChange(fieldKey, e.target.value as InitiativeInput[K])}
          required={required}
        />
      </div>
    );
  }

  if (options) {
    // mantém o valor atual como opção mesmo se não estiver na lista (evita perder dado)
    const list = current && !options.includes(current) ? [current, ...options] : options;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <select
          id={id}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
          value={current}
          onChange={(e) => onChange(fieldKey, e.target.value as InitiativeInput[K])}
          required={required}
        >
          <option value="">—</option>
          {list.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
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
        value={current}
        onChange={(e) => onChange(fieldKey, e.target.value as InitiativeInput[K])}
        required={required}
        readOnly={readOnly}
        list={listId}
        autoComplete={listId ? "off" : undefined}
        className={readOnly ? "bg-slate-50 text-slate-500" : undefined}
      />
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
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
