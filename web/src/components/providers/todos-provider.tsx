"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createInitiative,
  deleteInitiative,
  fetchInitiatives,
  updateInitiative,
} from "@/lib/todo-api";
import { EMPTY_FILTERS, type FilterState, type Initiative, type InitiativeInput } from "@/lib/types";

interface TodosContextValue {
  todos: Initiative[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  create: (payload: InitiativeInput) => Promise<Initiative>;
  update: (dbId: number, payload: InitiativeInput) => Promise<Initiative>;
  remove: (dbId: number) => Promise<void>;
}

const TodosContext = createContext<TodosContextValue | null>(null);

export function TodosProvider({ children }: { children: ReactNode }) {
  const [todos, setTodos] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInitiatives();
      setTodos(data);
      setConnected(true);
      setError(null);
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : "Erro ao conectar com a API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (payload: InitiativeInput) => {
    const created = await createInitiative(payload);
    setTodos((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (dbId: number, payload: InitiativeInput) => {
    const updated = await updateInitiative(dbId, payload);
    setTodos((prev) => prev.map((item) => (item.dbId === dbId ? updated : item)));
    return updated;
  }, []);

  const remove = useCallback(async (dbId: number) => {
    await deleteInitiative(dbId);
    setTodos((prev) => prev.filter((item) => item.dbId !== dbId));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const value = useMemo(
    () => ({
      todos,
      loading,
      error,
      connected,
      filters,
      setFilters,
      clearFilters,
      refresh,
      create,
      update,
      remove,
    }),
    [todos, loading, error, connected, filters, clearFilters, refresh, create, update, remove],
  );

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
}

export function useTodos() {
  const context = useContext(TodosContext);
  if (!context) throw new Error("useTodos deve ser usado dentro de TodosProvider");
  return context;
}
