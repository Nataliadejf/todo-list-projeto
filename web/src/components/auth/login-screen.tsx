"use client";

import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/lib/constants";
import { useAuth } from "@/components/providers/auth-provider";

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        const { pending } = await register(name, email, password);
        setInfo(
          pending
            ? "Cadastro enviado! Aguarde a aprovação do administrador para acessar."
            : "Cadastro concluído.",
        );
        setMode("login");
        setPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1120] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {BRAND.name} • {BRAND.subtitle}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{BRAND.appTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "login" ? "Entre com seu e-mail e senha" : "Crie sua conta de acesso"}
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === "register" ? (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="voce@empresa.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-600">{info}</p> : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-500">
          {mode === "login" ? (
            <button type="button" className="font-semibold text-blue-600 hover:underline" onClick={() => { setMode("register"); setError(null); setInfo(null); }}>
              Não tem conta? Cadastre-se
            </button>
          ) : (
            <button type="button" className="font-semibold text-blue-600 hover:underline" onClick={() => { setMode("login"); setError(null); setInfo(null); }}>
              Já tem conta? Entrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
