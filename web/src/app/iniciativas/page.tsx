import { Suspense } from "react";
import { IniciativasClient } from "./iniciativas-client";

export default function IniciativasPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando iniciativas...</p>}>
      <IniciativasClient />
    </Suspense>
  );
}
