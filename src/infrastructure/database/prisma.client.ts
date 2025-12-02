import { PrismaClient } from '@prisma/client';

import { env, isDev } from '../../config/index.js';
import { logger } from '../logging/logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function createPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const prisma = new PrismaClient({
    log: isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

  if (isDev) {
    prisma.$on('query', (e) => {
      logger.debug({ query: e.query, duration: e.duration }, 'Prisma Query');
    });
  }

  prisma.$on('error', (e) => {
    logger.error({ message: e.message }, 'Prisma Error');
  });

  if (isDev) {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}

export async function connectDatabase(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
}

export async function disconnectDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
