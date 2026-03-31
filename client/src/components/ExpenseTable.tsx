import type { Expense } from "../types/dashboard";

type ExpenseTableProps = {
  expenses: Expense[];
  userNameById: Map<string, string>;
  loading: boolean;
};

export function ExpenseTable({ expenses, userNameById, loading }: ExpenseTableProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur-md">
      <h2 className="mb-4 text-xl font-semibold">Gastos recientes</h2>
      {loading ? (
        <p className="text-slate-400">Cargando gastos...</p>
      ) : expenses.length === 0 ? (
        <p className="text-slate-400">No hay gastos registrados todavía.</p>
      ) : (
        <div className="space-y-3">
          {expenses.slice(0, 8).map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 p-3"
            >
              <div>
                <p className="font-medium text-slate-100">{expense.description}</p>
                <p className="text-sm text-slate-400">
                  Pagó: {userNameById.get(expense.creatorId) ?? expense.creatorId}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-200">{expense.amount.toFixed(2)}€</p>
                {expense.isRecurring && (
                  <span className="mt-1 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
                    Suscripción
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
