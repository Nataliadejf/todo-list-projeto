import { cn } from "@/lib/utils";

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
}

export function SelectField({ className, label, icon, children, ...props }: SelectFieldProps) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span> : null}
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span> : null}
        <select
          className={cn(
            "h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pr-8 text-sm text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
            icon ? "pl-9" : "pl-3",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
      </div>
    </label>
  );
}
