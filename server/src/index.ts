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

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (value: number) => Number((value / 100).toFixed(2));

type GroupMember = {
  id: string;
  name: string;
};

const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  const membersFromDebts = await prisma.user.findMany({
    where: {
      OR: [
        {
          debts: {
            some: {
              expense: { groupId },
            },
          },
        },
        {
          credits: {
            some: {
              expense: { groupId },
            },
          },
        },
        {
          createdExpenses: {
            some: { groupId },
          },
        },
      ],
    },
    select: { id: true, name: true },
  });

  // Current schema has no explicit group-members table.
  if (membersFromDebts.length > 0) {
    return membersFromDebts;
  }

  return prisma.user.findMany({
    select: { id: true, name: true },
  });
};

app.post("/auth/login", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "email es obligatorio." });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error en /auth/login:", error);
    return res.status(500).json({ error: "Error interno iniciando sesión." });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: "name, email y phone son obligatorios." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: "El email ya está registrado." });
    }

    const normalizedPhone = String(phone).replace(/\D/g, "");
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error("Error en /auth/register:", error);
    return res.status(500).json({ error: "Error interno registrando usuario." });
  }
});

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
        data: members
          .filter((member) => member.id !== creatorId)
          .map((member) => ({
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

app.get("/groups/:id/balances", async (req, res) => {
  try {
    const groupId = req.params.id;
    const members = await getGroupMembers(groupId);

    if (members.length === 0) {
      return res.json([]);
    }

    const debts = await prisma.debt.findMany({
      where: {
        isPaid: false,
        expense: { groupId },
      },
      select: {
        amount: true,
        debtorId: true,
        creditorId: true,
      },
    });

    const balanceByUser = new Map<string, number>();
    for (const member of members) {
      balanceByUser.set(member.id, 0);
    }

    for (const debt of debts) {
      if (debt.debtorId === debt.creditorId) {
        continue;
      }
      const amountInCents = toCents(debt.amount);
      balanceByUser.set(
        debt.creditorId,
        (balanceByUser.get(debt.creditorId) ?? 0) + amountInCents,
      );
      balanceByUser.set(
        debt.debtorId,
        (balanceByUser.get(debt.debtorId) ?? 0) - amountInCents,
      );
    }

    const response = members.map((member) => ({
      userId: member.id,
      userName: member.name,
      balance: fromCents(balanceByUser.get(member.id) ?? 0),
    }));

    return res.json(response);
  } catch (error) {
    console.error("Error calculando balances:", error);
    return res.status(500).json({ error: "Error interno calculando balances." });
  }
});

app.get("/groups/:id/settlements", async (req, res) => {
  try {
    const groupId = req.params.id;
    const members = await getGroupMembers(groupId);
    const userNameById = new Map(members.map((m) => [m.id, m.name]));

    const debts = await prisma.debt.findMany({
      where: {
        isPaid: false,
        expense: { groupId },
      },
      select: {
        amount: true,
        debtorId: true,
        creditorId: true,
      },
    });

    const balanceByUser = new Map<string, number>();
    for (const member of members) {
      balanceByUser.set(member.id, 0);
    }

    for (const debt of debts) {
      if (debt.debtorId === debt.creditorId) {
        continue;
      }
      const cents = toCents(debt.amount);
      balanceByUser.set(debt.creditorId, (balanceByUser.get(debt.creditorId) ?? 0) + cents);
      balanceByUser.set(debt.debtorId, (balanceByUser.get(debt.debtorId) ?? 0) - cents);
    }

    const creditors = [...balanceByUser.entries()]
      .filter(([, balance]) => balance > 0)
      .map(([userId, balance]) => ({ userId, balance }))
      .sort((a, b) => b.balance - a.balance);

    const debtors = [...balanceByUser.entries()]
      .filter(([, balance]) => balance < 0)
      .map(([userId, balance]) => ({ userId, balance: Math.abs(balance) }))
      .sort((a, b) => b.balance - a.balance);

    const settlements: { fromName: string; toName: string; amount: number }[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const payAmount = Math.min(debtors[i].balance, creditors[j].balance);
      if (payAmount > 0) {
        settlements.push({
          fromName: userNameById.get(debtors[i].userId) ?? debtors[i].userId,
          toName: userNameById.get(creditors[j].userId) ?? creditors[j].userId,
          amount: fromCents(payAmount),
        });
      }

      debtors[i].balance -= payAmount;
      creditors[j].balance -= payAmount;

      if (debtors[i].balance === 0) i += 1;
      if (creditors[j].balance === 0) j += 1;
    }

    return res.json(settlements);
  } catch (error) {
    console.error("Error calculando settlements:", error);
    return res.status(500).json({ error: "Error interno calculando liquidacion." });
  }
});

app.post("/debts/:id/notify/discord", async (req, res) => {
  try {
    const debtId = req.params.id;
    const webhookUrl = process.env.DISCORD_WEBHOOK;

    if (!webhookUrl) {
      return res.status(500).json({ error: "DISCORD_WEBHOOK no esta configurado." });
    }

    const debt = await prisma.debt.findUnique({
      where: { id: debtId },
      include: {
        debtor: { select: { name: true, phone: true } },
        creditor: { select: { name: true } },
        expense: { select: { description: true } },
      },
    });

    if (!debt) {
      return res.status(404).json({ error: "Deuda no encontrada." });
    }

    const message = `📢 SplitMoney Notice: ${debt.creditor.name} le recuerda a ${debt.debtor.name} su deuda de ${debt.amount}€ por ${debt.expense.description}. ¡Paga pronto! 💸`;
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });

    if (!discordResponse.ok) {
      const body = await discordResponse.text();
      return res.status(502).json({
        error: "Error enviando aviso a Discord.",
        details: body,
      });
    }

    return res.json({ ok: true, message: "Aviso enviado a Discord." });
  } catch (error) {
    console.error("Error en notify/discord:", error);
    return res.status(500).json({ error: "Error interno enviando aviso a Discord." });
  }
});

app.get("/debts/:id/notify/whatsapp", async (req, res) => {
  try {
    const debtId = req.params.id;
    const debt = await prisma.debt.findUnique({
      where: { id: debtId },
      include: {
        debtor: { select: { name: true, phone: true } },
        creditor: { select: { name: true } },
        expense: { select: { description: true } },
      },
    });

    if (!debt) {
      return res.status(404).json({ error: "Deuda no encontrada." });
    }

    const text = `👋 *Hola ${debt.debtor.name}*, debes *${debt.amount}€* por *${debt.expense.description}* a *${debt.creditor.name}*. 💸`;
    const encodedMessage = encodeURIComponent(text);
    const normalizedPhone = debt.debtor.phone?.replace(/\D/g, "") ?? "";
    const url =
      normalizedPhone.length > 0
        ? `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
        : `https://wa.me/?text=${encodedMessage}`;

    return res.json({ url });
  } catch (error) {
    console.error("Error en notify/whatsapp:", error);
    return res.status(500).json({ error: "Error interno generando enlace de WhatsApp." });
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
