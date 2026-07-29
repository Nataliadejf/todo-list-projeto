import { Suspense } from "react";
import { AdminClient } from "./admin-client";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Carregando...</p>}>
      <AdminClient />
    </Suspense>
  );
}
