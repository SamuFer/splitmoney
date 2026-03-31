import { prisma } from "./lib/prisma";

async function main() {
  const users = await prisma.user.findMany();
  console.log("Usuarios en la DB:", users);
}
main();
