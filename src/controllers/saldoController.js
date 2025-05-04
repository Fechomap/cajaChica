// src/controllers/saldoController.js
const cajaService = require('../services/cajaService');
const telegramService = require('../services/telegramService');

const saldoController = {
  handleSaldo: async (chatId, userId) => {
    try {
      const caja = await cajaService.findCaja(chatId);
      
      if (!caja) {
        await telegramService.sendSafeMessage(
          chatId, 
          '⚠️ Primero el supervisor debe iniciar la caja chica.'
        );
        return;
      }
      
      await telegramService.sendSaldoMessage(chatId, caja.saldo);
    } catch (error) {
      console.error('Error en handleSaldo:', error);
      await telegramService.sendSafeMessage(chatId, '❌ Error al obtener el saldo.');
    }
  }
};

module.exports = saldoController;