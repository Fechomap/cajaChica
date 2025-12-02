import { logger } from '../../../infrastructure/logging/logger.js';

import type { BotContext } from '../context.js';
import type { BotError } from 'grammy';

export function errorHandler(err: BotError<BotContext>): void {
  const ctx = err.ctx;
  const error = err.error;

  logger.error(
    {
      updateId: ctx.update.update_id,
      chatId: ctx.chat?.id,
      userId: ctx.from?.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
    'Bot error occurred'
  );

  // Try to notify user
  ctx.reply('Ha ocurrido un error. Por favor intenta de nuevo.').catch(() => {
    // Ignore errors when trying to reply
  });
}
