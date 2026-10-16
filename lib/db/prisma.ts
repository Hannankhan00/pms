import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Production Connection Pooling Strategy:
 * 1. Prisma Client Singleton: Prevents socket exhaustion across Next.js worker threads and serverless functions.
 * 2. Dedicated Connection Pool Parameters: In production, configure DATABASE_URL with:
 *    - `connection_limit=20`: Caps simultaneous connections per instance (prevents DB exhaustion).
 *    - `pool_timeout=10`: Rejects stranded query attempts if pool is fully saturated after 10s.
 *    - For AWS RDS / GCP Cloud SQL: Placed behind RDS Proxy or PgBouncer with transaction pooling mode.
 *    - For Edge / Distributed: Compatible with Prisma Accelerate or Neon Serverless pooled endpoints.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
