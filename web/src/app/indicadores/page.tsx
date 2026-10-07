import { Suspense } from "react";
import { IndicadoresClient } from "./indicadores-client";

export default function IndicadoresPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando indicadores...</p>}>
      <IndicadoresClient />
    </Suspense>
  );
}
