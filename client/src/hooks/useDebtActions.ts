import { useState } from "react";
import { BASE_URL } from "../types/dashboard";

type ToastFn = (type: "success" | "error", message: string) => void;

export function useDebtActions(showToast: ToastFn) {
  const [discordLoadingById, setDiscordLoadingById] = useState<Record<string, boolean>>({});
  const [whatsLoadingById, setWhatsLoadingById] = useState<Record<string, boolean>>({});

  const handleNotifyDiscord = async (debtId: string) => {
    setDiscordLoadingById((prev) => ({ ...prev, [debtId]: true }));
    try {
      const response = await fetch(`${BASE_URL}/debts/${debtId}/notify/discord`, { method: "POST" });
      if (!response.ok) throw new Error();
      showToast("success", "Notificación enviada al grupo");
    } catch {
      showToast("error", "No se pudo enviar el aviso por Discord");
    } finally {
      setDiscordLoadingById((prev) => ({ ...prev, [debtId]: false }));
    }
  };

  const handleWhatsApp = async (debtId: string) => {
    setWhatsLoadingById((prev) => ({ ...prev, [debtId]: true }));
    try {
      const response = await fetch(`${BASE_URL}/debts/${debtId}/notify/whatsapp`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { url: string };
      window.open(data.url, "_blank");
    } catch {
      showToast("error", "No se pudo abrir WhatsApp");
    } finally {
      setWhatsLoadingById((prev) => ({ ...prev, [debtId]: false }));
    }
  };

  return { discordLoadingById, whatsLoadingById, handleNotifyDiscord, handleWhatsApp };
}
