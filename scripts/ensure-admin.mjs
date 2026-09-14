import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@archiviasolution.it").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Amministrazione Archivia";

  if (!password) {
    const existing = await prisma.user.count();
    if (existing === 0) {
      throw new Error(
        "Nessun utente in database e SEED_ADMIN_PASSWORD non è impostata. Impostala sulle variabili Railway.",
      );
    }
    console.log("Admin già presente, nessuna creazione.");
    return;
  }

  const passwordHash = await hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Utente admin verificato: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
