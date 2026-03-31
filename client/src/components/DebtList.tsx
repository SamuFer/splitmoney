import { BellRing, Loader2, MessageCircle } from "lucide-react";

export type DebtRow = {
  id: string;
  amount: number;
  debtorId: string;
  creditorId: string;
  description: string;
};

type DebtListProps = {
  debts: DebtRow[];
  loading: boolean;
  userNameById: Map<string, string>;
  discordLoadingById: Record<string, boolean>;
  whatsLoadingById: Record<string, boolean>;
  onNotifyDiscord: (debtId: string) => Promise<void>;
  onNotifyWhatsApp: (debtId: string) => Promise<void>;
};

export function DebtList({
  debts,
  loading,
  userNameById,
  discordLoadingById,
  whatsLoadingById,
  onNotifyDiscord,
  onNotifyWhatsApp,
}: DebtListProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur-md">
      <h2 className="mb-4 text-xl font-semibold">Deudas individuales pendientes</h2>
      {loading ? (
        <p className="text-slate-400">Cargando deudas...</p>
      ) : debts.length === 0 ? (
        <p className="text-slate-400">No hay deudas pendientes para mostrar.</p>
      ) : (
        <div className="space-y-3">
          {debts.map((debt) => (
            <div
              key={debt.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-3 md:flex-row md:items-center md:justify-between"
            >
              <p className="text-sm">
                <span className="font-semibold">{userNameById.get(debt.debtorId) ?? "Deudor"}</span> debe{" "}
                <span className="font-semibold text-rose-400">{debt.amount.toFixed(2)}€</span> a{" "}
                <span className="font-semibold text-emerald-400">
                  {userNameById.get(debt.creditorId) ?? "Acreedor"}
                </span>{" "}
                por {debt.description}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onNotifyDiscord(debt.id)}
                  disabled={Boolean(discordLoadingById[debt.id])}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold hover:bg-indigo-500 disabled:opacity-60"
                >
                  {discordLoadingById[debt.id] ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
                  {discordLoadingById[debt.id] ? "Enviando..." : "Discord"}
                </button>
                <button
                  onClick={() => onNotifyWhatsApp(debt.id)}
                  disabled={Boolean(whatsLoadingById[debt.id])}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-60"
                >
                  {whatsLoadingById[debt.id] ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <MessageCircle size={16} />
                  )}
                  {whatsLoadingById[debt.id] ? "Abriendo..." : "WhatsApp"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
