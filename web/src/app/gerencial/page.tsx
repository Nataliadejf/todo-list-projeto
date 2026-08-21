import { Suspense } from "react";
import { GerencialClient } from "./gerencial-client";

export default function GerencialPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando visão gerencial...</p>}>
      <GerencialClient />
    </Suspense>
  );
}
