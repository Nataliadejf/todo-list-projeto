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
import { createTask, deleteTask, fetchTasks, updateTask } from "@/lib/task-api";
import type { Task, TaskInput } from "@/lib/types";

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (payload: TaskInput) => Promise<Task>;
  update: (id: string, payload: TaskInput) => Promise<Task>;
  remove: (id: string) => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (payload: TaskInput) => {
    const created = await createTask(payload);
    setTasks((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, payload: TaskInput) => {
    const updated = await updateTask(id, payload);
    setTasks((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({ tasks, loading, error, refresh, create, update, remove }),
    [tasks, loading, error, refresh, create, update, remove],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) throw new Error("useTasks deve ser usado dentro de TasksProvider");
  return context;
}
