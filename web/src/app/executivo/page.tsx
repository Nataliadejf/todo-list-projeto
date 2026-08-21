import { Suspense } from "react";
import { ExecutivoClient } from "./executivo-client";

export default function ExecutivoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando visão executiva...</p>}>
      <ExecutivoClient />
    </Suspense>
  );
}
