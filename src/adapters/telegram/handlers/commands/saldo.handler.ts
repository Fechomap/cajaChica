import type { BotContext } from '../../context.js';

export async function saldoHandler(ctx: BotContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;

  if (!chatId) {
    await ctx.reply('❌ No se pudo identificar el chat.');
    return;
  }

  // Solo funciona en grupos
  if (chatType === 'private') {
    await ctx.reply('❌ Este comando solo funciona en grupos.');
    return;
  }

  try {
    const getGroupUseCase = ctx.container.resolve('getGroupUseCase');
    const group = await getGroupUseCase.byTelegramIdOrNull(chatId);

    if (!group) {
      await ctx.reply('❌ Este grupo no está registrado. Use /inicializar primero.');
      return;
    }

    if (!group.isInitialized) {
      await ctx.reply('⚠️ Primero el supervisor debe iniciar la caja chica.');
      return;
    }

    // Formato original del bot
    const saldo = group.balance.amount.toFixed(2);
    const message = `💰 *Saldo Actual*:\n*${saldo}* pesos.`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply('❌ Error al obtener el saldo.');
  }
}
