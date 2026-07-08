import { Suspense } from "react";
import { TarefasClient } from "./tarefas-client";

export default function TarefasPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando tarefas...</p>}>
      <TarefasClient />
    </Suspense>
  );
}
