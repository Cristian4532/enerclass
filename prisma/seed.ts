import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/seed-database";

const prisma = new PrismaClient();

seedDatabase(prisma, { reset: true, log: true })
  .catch((error) => {
    console.error("❌ Error al sembrar la base de datos:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
