import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { BASE_URL } from "../types/dashboard";

type AddExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  groupId: string;
  creatorId: string;
  creatorName: string;
};

export function AddExpenseModal({
  open,
  onClose,
  onCreated,
  groupId,
  creatorId,
  creatorName,
}: AddExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const reset = () => {
    setDescription("");
    setAmount("");
    setIsRecurring(false);
    setFormError("");
  };

  const submitExpense = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    const numericAmount = Number(amount);

    if (!description.trim()) return setFormError("La descripción es obligatoria.");
    if (!creatorId) return setFormError("No hay usuario logueado para asignar el gasto.");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return setFormError("El monto debe ser mayor que 0.");
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${BASE_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: numericAmount,
          groupId,
          creatorId,
          isRecurring,
        }),
      });
      if (!response.ok) throw new Error();
      reset();
      onClose();
      await onCreated();
    } catch {
      setFormError("No se pudo crear el gasto. Revisa que el backend esté disponible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            onSubmit={submitExpense}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-md"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Nuevo gasto</h3>
              <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="Descripción"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 outline-none focus:border-emerald-500"
                placeholder="Monto"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-300">
                Pagado por: <span className="font-semibold text-emerald-300">{creatorName}</span>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                Gasto Recurrente (Mensual)
              </label>
            </div>

            {formError && <p className="mt-3 text-sm text-rose-400">{formError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
              >
                {submitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
