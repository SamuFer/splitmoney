import { prisma } from "./lib/prisma";

const API_BASE_URL = "http://localhost:3001";

type BalanceRow = {
  userId: string;
  userName: string;
  balance: number;
};

type SettlementRow = {
  fromName: string;
  toName: string;
  amount: number;
};

async function main() {
  const group = await prisma.group.findFirst({
    where: { name: "Piso Compartido" },
  });

  if (!group) {
    throw new Error("No existe el grupo 'Piso Compartido'. Ejecuta primero el seed.");
  }

  const testDebt = await prisma.debt.findFirst({
    where: {
      isPaid: false,
      expense: { groupId: group.id },
    },
    include: {
      debtor: { select: { name: true } },
      creditor: { select: { name: true } },
      expense: { select: { description: true } },
    },
  });

  if (!testDebt) {
    throw new Error("No hay deudas de prueba para el grupo.");
  }

  const balancesRes = await fetch(`${API_BASE_URL}/groups/${group.id}/balances`);
  if (!balancesRes.ok) {
    throw new Error(`Error en /balances: ${balancesRes.status}`);
  }
  const balances = (await balancesRes.json()) as BalanceRow[];
  console.log("\n=== BALANCES ===");
  console.log(balances);

  const settlementsRes = await fetch(`${API_BASE_URL}/groups/${group.id}/settlements`);
  if (!settlementsRes.ok) {
    throw new Error(`Error en /settlements: ${settlementsRes.status}`);
  }
  const settlements = (await settlementsRes.json()) as SettlementRow[];
  console.log("\n=== SETTLEMENTS ===");
  console.log(settlements);

  const totalSettlement = settlements.reduce((sum, tx) => sum + tx.amount, 0);
  const totalPositiveBalances = balances
    .filter((row) => row.balance > 0)
    .reduce((sum, row) => sum + row.balance, 0);
  const diff = Math.abs(totalSettlement - totalPositiveBalances);
  const makesSense = diff < 0.01;

  console.log("\n=== VALIDACION SIMPLE ===");
  console.log({
    totalSettlement: Number(totalSettlement.toFixed(2)),
    totalPositiveBalances: Number(totalPositiveBalances.toFixed(2)),
    makesSense,
  });

  const discordRes = await fetch(`${API_BASE_URL}/debts/${testDebt.id}/notify/discord`, {
    method: "POST",
  });
  const discordPayload = await discordRes.json();

  console.log("\n=== DISCORD NOTIFY ===");
  console.log({
    debtId: testDebt.id,
    debtor: testDebt.debtor.name,
    creditor: testDebt.creditor.name,
    expense: testDebt.expense.description,
    status: discordRes.status,
    response: discordPayload,
  });
}

main()
  .catch((error) => {
    console.error("Error en test-fase3:", error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
