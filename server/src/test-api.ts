import { prisma } from "./lib/prisma";

const API_BASE_URL = "http://localhost:3001";

async function main() {
  const group = await prisma.group.findFirst({
    where: { name: "Piso Compartido" },
  });

  if (!group) {
    throw new Error("No existe el grupo 'Piso Compartido'. Ejecuta primero el seed.");
  }

  const creator = await prisma.user.findFirst({
    orderBy: { name: "asc" },
  });

  if (!creator) {
    throw new Error("No existen usuarios en la base de datos. Ejecuta primero el seed.");
  }

  const response = await fetch(`${API_BASE_URL}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: "Compra supermercado",
      amount: 30,
      groupId: group.id,
      creatorId: creator.id,
      isRecurring: false,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      `POST /expenses fallo con ${response.status}: ${JSON.stringify(payload)}`,
    );
  }

  console.log("POST /expenses OK:");
  console.log(payload);
}

main()
  .catch((error) => {
    console.error("Error en test-api:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
