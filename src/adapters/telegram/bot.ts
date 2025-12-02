import { Bot, session } from 'grammy';

import { ChatType } from '../../domain/entities/group.entity.js';
import { TelegramId } from '../../domain/value-objects/telegram-id.vo.js';
import { logger } from '../../infrastructure/logging/logger.js';

import {
  handleVerSaldo,
  handleIniciarCaja,
  handleAgregarDinero,
  handleRestarDinero,
  handleConfirmarAgregar,
  handleConfirmarRestar,
  handleCancelar,
} from './handlers/callbacks/index.js';
import { startHandler, helpHandler, saldoHandler, supHandler } from './handlers/commands/index.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { sessionState } from './state/index.js';

import type { BotContext, SessionData } from './context.js';
import type { AppContainer } from '../../container/types.js';

export interface CreateBotOptions {
  token: string;
  container: AppContainer;
}

export function createBot(options: CreateBotOptions): Bot<BotContext> {
  const { token, container } = options;
  const bot = new Bot<BotContext>(token);

  // Error handler global
  bot.catch(errorHandler);

  // Inject container into context
  bot.use(async (ctx, next) => {
    ctx.container = container;
    await next();
  });

  // Session middleware
  bot.use(
    session({
      initial: (): SessionData => ({
        state: 'idle',
        data: {},
      }),
    })
  );

  // Comandos básicos
  bot.command('start', startHandler);
  bot.command('help', helpHandler);
  bot.command('ayuda', helpHandler);

  // Comandos de caja
  bot.command('saldo', saldoHandler);
  bot.command('sup', supHandler);

  // Callback queries (botones inline)
  bot.callbackQuery('verSaldo', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleVerSaldo(ctx);
  });

  bot.callbackQuery('iniciarCaja', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleIniciarCaja(ctx);
  });

  bot.callbackQuery('agregarDinero', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAgregarDinero(ctx);
  });

  bot.callbackQuery('restarDinero', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleRestarDinero(ctx);
  });

  bot.callbackQuery('confirmarAgregar', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleConfirmarAgregar(ctx);
  });

  bot.callbackQuery('confirmarRestar', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleConfirmarRestar(ctx);
  });

  bot.callbackQuery('cancelar', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleCancelar(ctx);
  });

  // Handler de mensajes para procesar confirmaciones pendientes
  bot.on('message:text', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const text = ctx.message?.text;

    if (!userId || !chatId || !text) return;

    // Ignorar comandos
    if (text.startsWith('/')) return;

    // Procesar conceptos pendientes (primero pide concepto)
    const waitingConcept = sessionState.getWaitingForConcept(userId);
    if (waitingConcept) {
      const concepto = text.trim();

      if (concepto.length < 3) {
        await ctx.reply('⚠️ Por favor, ingresa una descripción válida (mínimo 3 caracteres).');
        return;
      }

      // Guardar concepto y pedir cantidad
      sessionState.setPendingConfirmation(userId, {
        chatId,
        tipo: waitingConcept.tipo,
        concepto,
      });

      const mensaje =
        waitingConcept.tipo === 'agregarDinero'
          ? `📝 Concepto registrado: *${concepto}*\n\n💵 Ahora, ¿cuánto dinero deseas agregar?`
          : `📝 Concepto registrado: *${concepto}*\n\n💵 Ahora, ¿cuánto dinero deseas restar?`;

      await ctx.reply(mensaje, { parse_mode: 'Markdown' });
      sessionState.deleteWaitingForConcept(userId);
      return;
    }

    // Procesar confirmaciones pendientes (luego pide cantidad)
    const confirmation = sessionState.getPendingConfirmation(userId);
    if (confirmation) {
      const cantidad = parseFloat(text);

      if (isNaN(cantidad) || cantidad <= 0) {
        await ctx.reply('⚠️ Por favor, ingresa una cantidad válida.');
        return;
      }

      if (confirmation.tipo === 'iniciarCaja') {
        // Iniciar caja directamente
        try {
          const getGroupUseCase = ctx.container.resolve('getGroupUseCase');
          const initializeGroupUseCase = ctx.container.resolve('initializeGroupUseCase');
          const groupRepository = ctx.container.resolve('groupRepository');

          let group = await getGroupUseCase.byTelegramIdOrNull(chatId);

          if (!group) {
            const chatTitle = ctx.chat?.title ?? 'Chat Privado';
            group = await groupRepository.create({
              telegramId: TelegramId.create(chatId),
              organizationId: 'default',
              title: chatTitle,
              type: ctx.chat?.type === 'supergroup' ? ChatType.SUPERGROUP : ChatType.GROUP,
            });
          }

          await initializeGroupUseCase.execute({
            groupId: group.id,
            initialBalance: cantidad,
          });

          await ctx.reply(
            `✅ Se ha iniciado la caja chica con *$${cantidad.toFixed(2)}* pesos. 💰`,
            {
              parse_mode: 'Markdown',
            }
          );

          sessionState.deletePendingConfirmation(userId);
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Error desconocido';
          await ctx.reply(`❌ Error al inicializar la caja: ${msg}`);
          sessionState.deletePendingConfirmation(userId);
        }
        return;
      }

      // Para agregar/restar dinero: validar saldo y pedir confirmación
      if (confirmation.tipo === 'restarDinero') {
        try {
          const getGroupUseCase = ctx.container.resolve('getGroupUseCase');
          const group = await getGroupUseCase.byTelegramIdOrNull(chatId);

          if (!group?.isInitialized) {
            await ctx.reply('⚠️ La caja chica no ha sido iniciada.');
            return;
          }

          if (cantidad > group.balance.amount) {
            await ctx.reply(
              `⚠️ No puedes restar una cantidad mayor al saldo actual de la caja chica (*$${group.balance.amount.toFixed(2)}* pesos).`,
              { parse_mode: 'Markdown' }
            );
            return;
          }
        } catch {
          await ctx.reply('❌ Error al validar el saldo.');
          return;
        }
      }

      // Actualizar cantidad y pedir confirmación
      confirmation.cantidad = cantidad;
      sessionState.setPendingConfirmation(userId, confirmation);

      const confirmAction =
        confirmation.tipo === 'agregarDinero' ? 'confirmarAgregar' : 'confirmarRestar';
      const mensajeConfirm =
        confirmation.tipo === 'agregarDinero'
          ? `¿Estás seguro de que deseas agregar *$${cantidad.toFixed(2)}* pesos a la caja chica?`
          : `¿Estás seguro de que deseas restar *$${cantidad.toFixed(2)}* pesos de la caja chica?`;

      await ctx.reply(mensajeConfirm, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Sí', callback_data: confirmAction },
              { text: '❌ No', callback_data: 'cancelar' },
            ],
          ],
        },
      });
    }
  });

  logger.info('Bot created with grammY');

  return bot;
}

export async function setupWebhook(bot: Bot<BotContext>, webhookUrl: string): Promise<void> {
  await bot.api.setWebhook(webhookUrl, {
    allowed_updates: ['message', 'callback_query', 'chat_member'],
    drop_pending_updates: true,
  });
  logger.info({ webhookUrl }, 'Webhook configured');
}

export async function startPolling(bot: Bot<BotContext>): Promise<void> {
  await bot.api.deleteWebhook({ drop_pending_updates: true });
  bot.start({
    onStart: () => {
      logger.info('Bot started in polling mode');
    },
  });
}
