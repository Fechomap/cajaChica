import type { BotContext } from '../../context.js';

export async function helpHandler(ctx: BotContext): Promise<void> {
  const helpMessage = `
*Bot de Caja Chica - Ayuda*

*Comandos disponibles:*
/start - Iniciar el bot
/help o /ayuda - Mostrar esta ayuda
/saldo - Ver el saldo actual del grupo
/sup - Menu de supervisores

*Menu de Supervisores (/sup):*
- Iniciar Caja - Establecer saldo inicial
- Agregar Dinero - Registrar un ingreso
- Restar Dinero - Registrar un gasto
- Ver Saldo - Consultar saldo actual

Para gestionar la caja chica, usa /sup en el grupo y sigue las instrucciones con los botones.
  `.trim();

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}
