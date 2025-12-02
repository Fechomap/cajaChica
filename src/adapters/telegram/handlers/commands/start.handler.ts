import type { BotContext } from '../../context.js';

export async function startHandler(ctx: BotContext): Promise<void> {
  const firstName = ctx.from?.first_name ?? 'Usuario';

  const welcomeMessage = `
Hola ${firstName}! Bienvenido al Bot de Caja Chica.

Este bot te ayuda a gestionar los gastos e ingresos de tu grupo.

*Comandos disponibles:*
/sup - Menu de supervisores (agregar/restar dinero, ver saldo)
/saldo - Consultar el saldo actual
/help - Ver ayuda

Usa /sup en un grupo para gestionar la caja chica.
  `.trim();

  await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
}
