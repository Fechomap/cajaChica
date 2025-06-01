// src/controllers/saldoController.js
const transactionService = require('../services/transactionService');
const telegramService = require('../services/telegramService');
const authService = require('../services/authService');

const saldoController = {
  handleSaldo: async (ctx) => {
    try {
      const chatId = ctx.chat.id;
      const userId = ctx.from.id;

      // Verificar si es un grupo
      if (ctx.chat.type === 'private') {
        await telegramService.sendSafeMessage(
          chatId,
          '❌ Este comando solo funciona en grupos.'
        );
        return;
      }

      // Obtener contexto del usuario
      const userContext = await authService.getUserContext(userId);
      
      const groupId = ctx.groupContext?.id;

      // Obtener información del balance
      const balanceInfo = await transactionService.getBalance(
        groupId,
        userContext.user.id
      );

      if (!balanceInfo.isInitialized) {
        await telegramService.sendSafeMessage(
          chatId,
          '⚠️ Primero el supervisor debe iniciar la caja chica.'
        );
        return;
      }

      // Enviar mensaje con el saldo
      await telegramService.sendSaldoMessage(chatId, balanceInfo.balance);
    } catch (error) {
      console.error('Error en handleSaldo:', error);
      
      if (error.message.includes('permisos')) {
        await telegramService.sendSafeMessage(
          ctx.chat.id,
          `❌ ${error.message}`
        );
      } else {
        await telegramService.sendSafeMessage(
          ctx.chat.id,
          '❌ Error al obtener el saldo.'
        );
      }
    }
  }
};

module.exports = saldoController;