import { useCallback, useEffect, useState } from "react";
import { BASE_URL } from "../types/dashboard";
import type { Balance, Expense, Settlement } from "../types/dashboard";

export function useDashboardData(groupId: string, enabled = true) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled || !groupId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const [balancesRes, expensesRes, settlementsRes] = await Promise.all([
        fetch(`${BASE_URL}/groups/${groupId}/balances`),
        fetch(`${BASE_URL}/groups/${groupId}/expenses`),
        fetch(`${BASE_URL}/groups/${groupId}/settlements`),
      ]);

      if (!balancesRes.ok || !expensesRes.ok || !settlementsRes.ok) {
        throw new Error("No se pudo cargar el dashboard");
      }

      const [balancesData, expensesData, settlementsData] = await Promise.all([
        balancesRes.json() as Promise<Balance[]>,
        expensesRes.json() as Promise<Expense[]>,
        settlementsRes.json() as Promise<Settlement[]>,
      ]);

      setBalances(balancesData);
      setExpenses(expensesData);
      setSettlements(settlementsData);
    } catch {
      setError("Error de conexión con la API. Verifica que el backend esté activo.");
    } finally {
      setLoading(false);
    }
  }, [enabled, groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { balances, expenses, settlements, loading, error, refresh };
}
