import { prisma } from "./lib/prisma";

async function main() {
  const brunoDebts = await prisma.debt.findMany({
    where: {
      debtor: { name: "Bruno" },
    },
    include: {
      debtor: { select: { name: true, phone: true } },
      creditor: { select: { name: true } },
      expense: { select: { description: true } },
    },
    orderBy: { id: "desc" },
  });

  const validBrunoDebt = brunoDebts.find((debt) => debt.debtorId !== debt.creditorId);

  const allDebts = validBrunoDebt
    ? []
    : await prisma.debt.findMany({
        include: {
          debtor: { select: { name: true, phone: true } },
          creditor: { select: { name: true } },
          expense: { select: { description: true } },
        },
        orderBy: { id: "desc" },
      });

  const validFallbackDebt = allDebts.find((debt) => debt.debtorId !== debt.creditorId);
  const debt = validBrunoDebt ?? validFallbackDebt;

  if (!debt) {
    throw new Error("No hay deudas para generar la URL de WhatsApp.");
  }

  const text = `👋 *Hola ${debt.debtor.name}*, debes *${debt.amount}€* por *${debt.expense.description}* a *${debt.creditor.name}*. 💸`;
  const encodedMessage = encodeURIComponent(text);
  const normalizedPhone = debt.debtor.phone?.replace(/\D/g, "") ?? "";
  const url =
    normalizedPhone.length > 0
      ? `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

  console.log(url);
}

main()
  .catch((error) => {
    console.error("Error en test-whatsapp:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
