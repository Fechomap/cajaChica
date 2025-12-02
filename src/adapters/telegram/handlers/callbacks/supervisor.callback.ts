import { TelegramId } from '../../../../domain/value-objects/telegram-id.vo.js';
import { sessionState } from '../../state/session-state.js';

import type { BotContext } from '../../context.js';

export async function handleVerSaldo(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  try {
    const getGroupUseCase = ctx.container.resolve('getGroupUseCase');
    const group = await getGroupUseCase.byTelegramIdOrNull(chatId);

    if (!group) {
      await ctx.reply('❌ Este grupo no está registrado.');
      return;
    }

    if (!group.isInitialized) {
      await ctx.reply('⚠️ Primero debes iniciar la caja chica.');
      return;
    }

    const saldo = group.balance.amount.toFixed(2);
    await ctx.reply(`💰 *Saldo Actual*:\n*${saldo}* pesos.`, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply('⚠️ Error al obtener el saldo.');
  }
}

export async function handleIniciarCaja(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) return;

  try {
    const getGroupUseCase = ctx.container.resolve('getGroupUseCase');
    const group = await getGroupUseCase.byTelegramIdOrNull(chatId);

    if (group?.isInitialized) {
      await ctx.reply('⚠️ La caja chica ya ha sido iniciada y no puede reiniciarse.');
      return;
    }

    await ctx.reply('🏁 *Iniciar Caja Chica*:\nPor favor, ingresa el monto inicial:', {
      parse_mode: 'Markdown',
    });

    sessionState.setPendingConfirmation(userId, { chatId, tipo: 'iniciarCaja' });
  } catch (error) {
    const logger = ctx.container.resolve('logger');
    logger.error({ error, chatId, userId }, 'Error en handleIniciarCaja');

    if (error instanceof Error && error.message === 'Grupo no registrado') {
      await ctx.reply('⚠️ Este grupo no está registrado. Contacta al administrador.');
    } else {
      await ctx.reply('⚠️ Error al verificar el estado del grupo.');
    }
  }
}

export async function handleAgregarDinero(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) return;

  sessionState.setWaitingForConcept(userId, { chatId, tipo: 'agregarDinero' });

  await ctx.reply(
    '➕ *Agregar Dinero*:\n¿Cuál es el concepto del ingreso? (describe el origen del dinero)',
    { parse_mode: 'Markdown' }
  );
}

export async function handleRestarDinero(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) return;

  sessionState.setWaitingForConcept(userId, { chatId, tipo: 'restarDinero' });

  await ctx.reply('➖ *Restar Dinero*:\n¿Para qué es el gasto? (describe el concepto)', {
    parse_mode: 'Markdown',
  });
}

export async function handleConfirmarAgregar(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) return;

  const confirmData = sessionState.getPendingConfirmation(userId);
  if (!confirmData?.cantidad || !confirmData?.concepto) {
    await ctx.reply('❌ No hay operación pendiente.');
    return;
  }

  try {
    const getGroupUseCase = ctx.container.resolve('getGroupUseCase');
    const createTransactionUseCase = ctx.container.resolve('createTransactionUseCase');
    const userRepository = ctx.container.resolve('userRepository');

    const group = await getGroupUseCase.byTelegramIdOrNull(chatId);
    if (!group) {
      await ctx.reply('❌ Grupo no encontrado.');
      return;
    }

    const userTelegramId = TelegramId.create(userId);
    let user = await userRepository.findByTelegramId(userTelegramId);
    if (!user) {
      user = await userRepository.create({
        telegramId: userTelegramId,
        firstName: ctx.from?.first_name ?? 'Usuario',
      });
    }

    const transaction = await createTransactionUseCase.execute({
      groupId: group.id,
      userId: user.id,
      type: 'INCOME',
      amount: confirmData.cantidad,
      concept: confirmData.concepto,
    });

    const newSaldo = transaction.balanceAfter.amount.toFixed(2);
    await ctx.reply(
      `✅ Se han agregado *$${confirmData.cantidad.toFixed(2)}* pesos. Nuevo saldo: *$${newSaldo}* pesos. 💵`,
      { parse_mode: 'Markdown' }
    );

    sessionState.deletePendingConfirmation(userId);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    await ctx.reply(`❌ Error al actualizar el saldo: ${msg}`);
  }
}

export async function handleConfirmarRestar(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) return;

  const confirmData = sessionState.getPendingConfirmation(userId);
  if (!confirmData?.cantidad || !confirmData?.concepto) {
    await ctx.reply('❌ No hay operación pendiente.');
    return;
  }

  try {
    const getGroupUseCase = ctx.container.resolve('getGroupUseCase');
    const createTransactionUseCase = ctx.container.resolve('createTransactionUseCase');
    const userRepository = ctx.container.resolve('userRepository');

    const group = await getGroupUseCase.byTelegramIdOrNull(chatId);
    if (!group) {
      await ctx.reply('❌ Grupo no encontrado.');
      return;
    }

    const userTelegramId = TelegramId.create(userId);
    let user = await userRepository.findByTelegramId(userTelegramId);
    if (!user) {
      user = await userRepository.create({
        telegramId: userTelegramId,
        firstName: ctx.from?.first_name ?? 'Usuario',
      });
    }

    const transaction = await createTransactionUseCase.execute({
      groupId: group.id,
      userId: user.id,
      type: 'EXPENSE',
      amount: confirmData.cantidad,
      concept: confirmData.concepto,
    });

    const newSaldo = transaction.balanceAfter.amount.toFixed(2);
    await ctx.reply(
      `✅ Se han restado *$${confirmData.cantidad.toFixed(2)}* pesos. Nuevo saldo: *$${newSaldo}* pesos. 💸`,
      { parse_mode: 'Markdown' }
    );

    sessionState.deletePendingConfirmation(userId);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    await ctx.reply(`❌ Error al actualizar el saldo: ${msg}`);
  }
}

export async function handleCancelar(ctx: BotContext): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  sessionState.deletePendingConfirmation(userId);
  sessionState.deleteWaitingForConcept(userId);

  await ctx.reply('❌ Operación cancelada.');
}
