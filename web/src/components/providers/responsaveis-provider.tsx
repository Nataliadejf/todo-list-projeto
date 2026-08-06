"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchResponsaveis } from "@/lib/responsaveis-api";
import { RESPONSAVEL_OPTIONS } from "@/lib/constants";

interface ResponsaveisContextValue {
  responsaveis: string[];
  refresh: () => Promise<void>;
}

const ResponsaveisContext = createContext<ResponsaveisContextValue | null>(null);

export function ResponsaveisProvider({ children }: { children: ReactNode }) {
  // Fallback para a lista fixa enquanto carrega (ou se a API falhar).
  const [responsaveis, setResponsaveis] = useState<string[]>([...RESPONSAVEL_OPTIONS]);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchResponsaveis();
      if (Array.isArray(list) && list.length > 0) setResponsaveis(list);
    } catch {
      /* mantém o fallback */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ responsaveis, refresh }), [responsaveis, refresh]);
  return <ResponsaveisContext.Provider value={value}>{children}</ResponsaveisContext.Provider>;
}

export function useResponsaveis() {
  const ctx = useContext(ResponsaveisContext);
  if (!ctx) throw new Error("useResponsaveis deve ser usado dentro de ResponsaveisProvider");
  return ctx;
}
