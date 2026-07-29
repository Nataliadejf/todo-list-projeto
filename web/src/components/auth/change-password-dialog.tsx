"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiChangePassword } from "@/lib/auth-api";

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 6) return setError("A nova senha deve ter ao menos 6 caracteres.");
    if (next !== confirm) return setError("A confirmação não confere com a nova senha.");
    setBusy(true);
    try {
      await apiChangePassword(current, next);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar a senha.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900">Alterar senha</h2>
        {done ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-emerald-600">Senha alterada com sucesso.</p>
            <Button className="w-full" onClick={onClose}>Fechar</Button>
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="cur">Senha atual</Label>
              <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nw">Nova senha</Label>
              <Input id="nw" type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf">Confirmar nova senha</Label>
              <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
              <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
