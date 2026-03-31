import type { ReactNode } from "react";

type StatCardProps = {
  icon: ReactNode;
  title: string;
  value: string;
  accentClass: string;
};

export function StatCard({ icon, title, value, accentClass }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-md">
      <div className="flex items-center gap-3 text-slate-300">
        {icon}
        <p>{title}</p>
      </div>
      <p className={`mt-3 text-4xl font-bold ${accentClass}`}>{value}</p>
    </div>
  );
}
