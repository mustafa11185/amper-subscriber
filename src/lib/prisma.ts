import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[prisma] DATABASE_URL is not set!");
  }
  const adapter = new PrismaPg({
    connectionString: connectionString || "",
  });
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma;
