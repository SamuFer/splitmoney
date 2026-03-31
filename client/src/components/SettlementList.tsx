import type { Settlement } from "../types/dashboard";

type SettlementListProps = {
  settlements: Settlement[];
  loading: boolean;
};

export function SettlementList({ settlements, loading }: SettlementListProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur-md">
      <h2 className="mb-4 text-xl font-semibold">Liquidación</h2>
      {loading ? (
        <p className="text-slate-400">Calculando simplificación...</p>
      ) : settlements.length === 0 ? (
        <p className="text-slate-400">No hay pagos sugeridos. Todo está equilibrado.</p>
      ) : (
        <ul className="space-y-2">
          {settlements.map((settlement, index) => (
            <li key={`${settlement.fromName}-${index}`} className="rounded-lg bg-slate-900/70 p-3">
              <span className="text-slate-200">{settlement.fromName}</span> debe pagar{" "}
              <span className="font-semibold text-rose-400">{settlement.amount.toFixed(2)}€</span> a{" "}
              <span className="font-semibold text-emerald-400">{settlement.toName}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
