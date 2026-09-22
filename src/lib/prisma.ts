import { PrismaClient } from "@prisma/client";

// Evita múltiplas conexões em dev (hot reload) — importante no MySQL compartilhado da Hostinger.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
