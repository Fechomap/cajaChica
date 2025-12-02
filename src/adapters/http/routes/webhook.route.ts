import { webhookCallback } from 'grammy';
import { Hono } from 'hono';

import type { BotContext } from '../../telegram/context.js';
import type { Bot } from 'grammy';

export function createWebhookRoute(bot: Bot<BotContext>): Hono {
  const webhookRoute = new Hono();

  webhookRoute.post('/', async (c) => {
    const handleUpdate = webhookCallback(bot, 'hono');
    return handleUpdate(c);
  });

  return webhookRoute;
}
