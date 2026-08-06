"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchResponsaveis } from "@/lib/responsaveis-api";
import { RESPONSAVEL_OPTIONS } from "@/lib/constants";

interface ResponsaveisContextValue {
  responsaveis: string[]; // ativos — usados para seleção (formulário)
  inactiveNames: Set<string>; // inativos — usados para ocultar iniciativas/telas
  refresh: () => Promise<void>;
}

const ResponsaveisContext = createContext<ResponsaveisContextValue | null>(null);

export function ResponsaveisProvider({ children }: { children: ReactNode }) {
  // Fallback para a lista fixa enquanto carrega (ou se a API falhar).
  const [responsaveis, setResponsaveis] = useState<string[]>([...RESPONSAVEL_OPTIONS]);
  const [inactive, setInactive] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchResponsaveis();
      if (Array.isArray(list) && list.length > 0) {
        setResponsaveis(list.filter((r) => r.active).map((r) => r.name));
        setInactive(list.filter((r) => !r.active).map((r) => r.name));
      }
    } catch {
      /* mantém o fallback */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const inactiveNames = useMemo(() => new Set(inactive.map((n) => n.trim())), [inactive]);
  const value = useMemo(
    () => ({ responsaveis, inactiveNames, refresh }),
    [responsaveis, inactiveNames, refresh],
  );
  return <ResponsaveisContext.Provider value={value}>{children}</ResponsaveisContext.Provider>;
}

export function useResponsaveis() {
  const ctx = useContext(ResponsaveisContext);
  if (!ctx) throw new Error("useResponsaveis deve ser usado dentro de ResponsaveisProvider");
  return ctx;
}
