import cors from "cors";
import express from "express";
import cron from "node-cron";
import { prisma } from "./lib/prisma";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const addOneMonth = (date: Date) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
};

app.post("/expenses", async (req, res) => {
  try {
    const { description, amount, groupId, creatorId, isRecurring, dueDate } = req.body;

    if (!description || !groupId || !creatorId || typeof isRecurring !== "boolean") {
      return res.status(400).json({
        error: "description, groupId, creatorId e isRecurring son obligatorios.",
      });
    }

    if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "amount debe ser un numero mayor que 0." });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: "Grupo no encontrado." });
    }

    const creator = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!creator) {
      return res.status(404).json({ error: "Usuario creador no encontrado." });
    }

    // Current schema has no GroupMember table, so we use all users as group members.
    const members = await prisma.user.findMany();
    if (members.length === 0) {
      return res.status(400).json({ error: "No hay usuarios para repartir el gasto." });
    }

    const splitAmount = amount / members.length;
    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ error: "dueDate no es una fecha valida." });
    }

    const createdExpense = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          description,
          amount,
          groupId,
          creatorId,
          isRecurring,
          dueDate: parsedDueDate,
          nextBillingDate: isRecurring ? addOneMonth(new Date()) : null,
        },
      });

      await tx.debt.createMany({
        data: members.map((member) => ({
          amount: splitAmount,
          debtorId: member.id,
          creditorId: creatorId,
          expenseId: expense.id,
        })),
      });

      return tx.expense.findUnique({
        where: { id: expense.id },
        include: { debts: true },
      });
    });

    return res.status(201).json(createdExpense);
  } catch (error) {
    console.error("Error creando expense:", error);
    return res.status(500).json({ error: "Error interno creando el gasto." });
  }
});

app.get("/groups/:id/expenses", async (req, res) => {
  try {
    const groupId = req.params.id;

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { debts: true },
      orderBy: { dueDate: "asc" },
    });

    return res.json(expenses);
  } catch (error) {
    console.error("Error listando expenses del grupo:", error);
    return res.status(500).json({ error: "Error interno listando gastos del grupo." });
  }
});

cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();
    const recurringExpenses = await prisma.expense.findMany({
      where: {
        isRecurring: true,
        nextBillingDate: { lte: now },
      },
      include: {
        debts: {
          select: { debtorId: true },
        },
      },
    });

    for (const expense of recurringExpenses) {
      const debtorIds = Array.from(new Set(expense.debts.map((debt) => debt.debtorId)));
      const targetDebtorIds =
        debtorIds.length > 0
          ? debtorIds
          : (await prisma.user.findMany({ select: { id: true } })).map((user) => user.id);

      if (targetDebtorIds.length === 0) {
        continue;
      }

      const splitAmount = expense.amount / targetDebtorIds.length;

      await prisma.$transaction(async (tx) => {
        await tx.debt.createMany({
          data: targetDebtorIds.map((debtorId) => ({
            amount: splitAmount,
            debtorId,
            creditorId: expense.creatorId,
            expenseId: expense.id,
          })),
        });

        await tx.expense.update({
          where: { id: expense.id },
          data: { nextBillingDate: addOneMonth(now) },
        });
      });
    }
  } catch (error) {
    console.error("Error ejecutando cron de recurring expenses:", error);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
