// src/services/telegramService.js
const bot = require('../config/bot');
const cajaService = require('./cajaService');

const telegramService = {
  sendSafeMessage: async (chatId, text, options = {}) => {
    try {
      return await bot.sendMessage(chatId, text, options);
    } catch (error) {
      if (error.response?.parameters?.migrate_to_chat_id) {
        const newChatId = error.response.parameters.migrate_to_chat_id;
        console.log(`🔄 Chat migrado: ${chatId} -> ${newChatId}`);
        
        try {
          await cajaService.updateChatId(chatId, newChatId);
          return await bot.sendMessage(newChatId, text, options);
        } catch (updateError) {
          console.error('Error en migración de chat:', updateError);
          throw updateError;
        }
      }
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  },

  sendSaldoMessage: async (chatId, saldo) => {
    const message = `💰 *Saldo Actual*:\n*${saldo.toFixed(2)}* pesos.`;
    return await telegramService.sendSafeMessage(chatId, message, { parse_mode: 'Markdown' });
  },

  sendOperationConfirmation: async (chatId, operation, amount, newSaldo) => {
    const messages = {
      add: `✅ Se han agregado *$${amount.toFixed(2)}* pesos. Nuevo saldo: *$${newSaldo.toFixed(2)}* pesos. 💵`,
      subtract: `✅ Se han restado *$${amount.toFixed(2)}* pesos. Nuevo saldo: *$${newSaldo.toFixed(2)}* pesos. 💸`
    };
    
    return await telegramService.sendSafeMessage(chatId, messages[operation], { parse_mode: 'Markdown' });
  }
};

module.exports = telegramService;