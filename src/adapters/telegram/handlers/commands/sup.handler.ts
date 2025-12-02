import type { BotContext } from '../../context.js';

export async function supHandler(ctx: BotContext): Promise<void> {
  const chatType = ctx.chat?.type;

  // Solo funciona en grupos
  if (chatType === 'private') {
    await ctx.reply('❌ Este comando solo funciona en grupos.');
    return;
  }

  await ctx.reply('🛠️ *Menú de Supervisores*:\nElige una opción:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏁 Iniciar Caja', callback_data: 'iniciarCaja' }],
        [{ text: '➕ Agregar Dinero', callback_data: 'agregarDinero' }],
        [{ text: '➖ Restar Dinero', callback_data: 'restarDinero' }],
        [{ text: '💰 Ver Saldo', callback_data: 'verSaldo' }],
      ],
    },
  });
}
