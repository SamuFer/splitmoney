import { prisma } from "./lib/prisma";

async function main() {
  await prisma.debt.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const users = await prisma.$transaction([
    prisma.user.create({
      data: { name: "Ana", email: "ana@example.com" },
    }),
    prisma.user.create({
      data: { name: "Bruno", email: "bruno@example.com" },
    }),
    prisma.user.create({
      data: { name: "Carla", email: "carla@example.com" },
    }),
  ]);

  const group = await prisma.group.create({
    data: { name: "Piso Compartido" },
  });

  const expense = await prisma.expense.create({
    data: {
      description: "Netflix",
      amount: 15,
      isRecurring: true,
      groupId: group.id,
      creatorId: users[0].id,
    },
  });

  const splitAmount = 15 / 3;

  await prisma.debt.createMany({
    data: users.map((user) => ({
      amount: splitAmount,
      debtorId: user.id,
      creditorId: users[0].id,
      expenseId: expense.id,
    })),
  });

  console.log("Seed completado: Piso Compartido + Netflix (15/3).");
}

main()
  .catch((error) => {
    console.error("Error en seed:", error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
