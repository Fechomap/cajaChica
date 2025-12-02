import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import { healthRoute, createWebhookRoute } from './adapters/http/routes/index.js';
import { logger } from './infrastructure/logging/logger.js';

import type { BotContext } from './adapters/telegram/context.js';
import type { AppContainer } from './container/types.js';
import type { Bot } from 'grammy';

type Variables = {
  container: AppContainer;
};

export interface AppOptions {
  container: AppContainer;
  bot: Bot<BotContext>;
}

export function createApp(options: AppOptions): Hono<{ Variables: Variables }> {
  const { container, bot } = options;
  const app = new Hono<{ Variables: Variables }>();

  // Middlewares globales
  app.use('*', honoLogger());
  app.use('*', cors());
  app.use('*', secureHeaders());

  // Inyectar container en el contexto
  app.use('*', async (c, next) => {
    c.set('container', container);
    await next();
  });

  // Rutas
  app.route('/health', healthRoute);
  app.route('/webhook', createWebhookRoute(bot));

  // Root route
  app.get('/', (c) => {
    return c.json({
      name: 'Caja Chica Bot',
      version: '2.0.0',
      status: 'running',
    });
  });

  // Error handler global
  app.onError((err, c) => {
    logger.error({ error: err.message, stack: err.stack }, 'HTTP Error');
    return c.json(
      {
        error: 'Internal Server Error',
        message: err.message,
      },
      500
    );
  });

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404);
  });

  return app;
}
