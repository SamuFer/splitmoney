import { CircleDollarSign, LogOut, Plus, WalletCards } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { DebtList } from "./components/DebtList";
import { ExpenseTable } from "./components/ExpenseTable";
import { SettlementList } from "./components/SettlementList";
import { StatCard } from "./components/StatCard";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDebtActions } from "./hooks/useDebtActions";
import { BASE_URL, DEFAULT_GROUP_ID } from "./types/dashboard";
import type { AuthUser, ToastState } from "./types/dashboard";

type AuthTab = "login" | "register";

function AuthScreen({ onAuth }: { onAuth: (user: AuthUser) => void }) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      if (!email.trim()) throw new Error("El email es obligatorio.");
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const body = tab === "login" ? { email } : { name, email, phone };
      if (tab === "register" && (!name.trim() || !phone.trim())) {
        throw new Error("Nombre y teléfono son obligatorios.");
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo autenticar.");

      localStorage.setItem("splitmoney_user", JSON.stringify(data));
      onAuth(data as AuthUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de autenticación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-md">
        <h1 className="text-3xl font-bold">SplitMoney</h1>
        <p className="mt-1 text-slate-400">Comparte gastos sin fricción.</p>
        <div className="mt-5 grid grid-cols-2 rounded-lg bg-slate-900 p-1">
          <button onClick={() => setTab("login")} className={`rounded-md px-3 py-2 text-sm ${tab === "login" ? "bg-emerald-600 font-semibold" : "text-slate-300"}`}>Iniciar Sesión</button>
          <button onClick={() => setTab("register")} className={`rounded-md px-3 py-2 text-sm ${tab === "register" ? "bg-emerald-600 font-semibold" : "text-slate-300"}`}>Registrarse</button>
        </div>
        <div className="mt-4 space-y-3">
          {tab === "register" && (
            <>
              <input className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-500" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-500" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </>
          )}
          <input className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-500" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        <button onClick={submit} disabled={loading} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60">{loading ? "Procesando..." : tab === "login" ? "Entrar" : "Crear cuenta"}</button>
      </motion.div>
    </main>
  );
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("splitmoney_user");
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthUser; } catch { return null; }
  });
  const [groupId, setGroupId] = useState(DEFAULT_GROUP_ID); //8d42bd3a-ba70-4576-a4e8-605f5a61de4a
  const [toast, setToast] = useState<ToastState>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { balances, expenses, settlements, loading, error, refresh } = useDashboardData(groupId, Boolean(user));
  const userNameById = useMemo(() => new Map(balances.map((b) => [b.userId, b.userName])), [balances]);
  const pendingDebts = useMemo(() => expenses.flatMap((expense) => expense.debts.filter((d) => !d.isPaid && d.debtorId !== d.creditorId).map((d) => ({ ...d, description: expense.description }))), [expenses]);
  const myIncoming = useMemo(() => pendingDebts.filter((d) => d.creditorId === user?.id).reduce((sum, d) => sum + d.amount, 0), [pendingDebts, user?.id]);
  const myOutgoing = useMemo(() => pendingDebts.filter((d) => d.debtorId === user?.id).reduce((sum, d) => sum + d.amount, 0), [pendingDebts, user?.id]);
  const myDebts = useMemo(() => pendingDebts.filter((d) => d.debtorId === user?.id || d.creditorId === user?.id), [pendingDebts, user?.id]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2600);
  };
  const { discordLoadingById, whatsLoadingById, handleNotifyDiscord, handleWhatsApp } = useDebtActions(showToast);

  if (!user) return <AuthScreen onAuth={setUser} />;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">SplitMoney Dashboard</h1>
            <p className="text-slate-400">Bienvenido, <span className="text-emerald-400">{user.name}</span></p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <input value={groupId} onChange={(e) => setGroupId(e.target.value)} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500" placeholder="Group ID" />
            <button onClick={refresh} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Recargar</button>
            <button onClick={() => { localStorage.removeItem("splitmoney_user"); setUser(null); }} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"><LogOut size={16} />Cerrar Sesión</button>
          </div>
        </div>
        {error && <p className="rounded-xl border border-rose-600/30 bg-rose-900/20 p-3 text-rose-300">{error}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard icon={<CircleDollarSign className="text-emerald-300" />} title="Personas que ME deben" value={`${myIncoming.toFixed(2)}€`} accentClass="text-emerald-400" />
          <StatCard icon={<WalletCards className="text-rose-300" />} title="Deudas que YO tengo" value={`${myOutgoing.toFixed(2)}€`} accentClass="text-rose-400" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ExpenseTable expenses={expenses} userNameById={userNameById} loading={loading} />
          <SettlementList settlements={settlements} loading={loading} />
        </div>
        <DebtList debts={myDebts.slice(0, 12)} loading={loading} userNameById={userNameById} discordLoadingById={discordLoadingById} whatsLoadingById={whatsLoadingById} onNotifyDiscord={handleNotifyDiscord} onNotifyWhatsApp={handleWhatsApp} />
      </div>

      <button onClick={() => setModalOpen(true)} className="fixed bottom-8 right-8 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 shadow-xl shadow-emerald-900/50 hover:bg-emerald-500" aria-label="Agregar gasto"><Plus /></button>
      <AddExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={refresh} groupId={groupId} creatorId={user.id} creatorName={user.name} />

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-xl ${toast.type === "success" ? "border-emerald-500/40 bg-emerald-900/80 text-emerald-100" : "border-rose-500/40 bg-rose-900/80 text-rose-100"}`}>{toast.message}</motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default App;
