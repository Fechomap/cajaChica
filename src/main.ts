import 'dotenv/config';

import { serve } from '@hono/node-server';

import { createBot, setupWebhook, startPolling } from './adapters/telegram/bot.js';
import { createApp } from './app.js';
import { env, isDev } from './config/index.js';
import { createContainer } from './container/index.js';
import { connectRedis } from './infrastructure/cache/redis.client.js';
import { connectDatabase } from './infrastructure/database/prisma.client.js';
import { logger } from './infrastructure/logging/logger.js';

async function bootstrap(): Promise<void> {
  logger.info('Starting Caja Chica Bot...');

  // 1. Crear container de dependencias
  const container = await createContainer();
  logger.info('Container created');

  // 2. Conectar a la base de datos
  const prisma = container.resolve('prisma');
  await connectDatabase(prisma);

  // 3. Conectar a Redis
  const redis = container.resolve('redis');
  try {
    await connectRedis(redis);
  } catch (error) {
    logger.warn({ error }, 'Redis connection failed, continuing without Redis');
  }

  // 4. Crear bot con container inyectado
  const bot = createBot({
    token: env.TELEGRAM_BOT_TOKEN,
    container,
  });

  // 5. Crear aplicación Hono
  const app = createApp({ container, bot });

  // 6. Configurar webhook o polling
  const railwayDomain = process.env['RAILWAY_PUBLIC_DOMAIN'];
  const webhookUrl =
    env.TELEGRAM_WEBHOOK_URL ?? (railwayDomain ? `https://${railwayDomain}/webhook` : null);

  if (isDev || !webhookUrl) {
    // Polling para desarrollo local
    await startPolling(bot);
  } else {
    // Webhook para producción
    await setupWebhook(bot, webhookUrl);
  }

  // 7. Iniciar servidor HTTP
  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      logger.info({ port: info.port }, `Server running on http://localhost:${info.port}`);
      if (webhookUrl) {
        logger.info({ webhookUrl }, 'Webhook endpoint configured');
      }
    }
  );

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down...');

    try {
      await bot.stop();
      await prisma.$disconnect();
      await redis.quit();
      logger.info('Cleanup completed');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ error: err }, 'Failed to start application');
  process.exit(1);
});
