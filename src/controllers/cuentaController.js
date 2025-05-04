// src/controllers/cuentaController.js
const messageHelper = require('../utils/messageHelper');
const telegramService = require('../services/telegramService');

const cuentaController = {
  state: {
    waitingForWhatsApp: new Set()
  },

  handleCuentaCommand: async (chatId) => {
    await telegramService.sendSafeMessage(
      chatId, 
      messageHelper.generateBankAccountMessage(), 
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "Enviar a WhatsApp 📦", callback_data: 'enviar_whatsapp' }]
          ]
        }
      }
    );
  },

  startWaitingForWhatsApp: async (chatId) => {
    cuentaController.state.waitingForWhatsApp.add(chatId);
    await telegramService.sendSafeMessage(
      chatId, 
      'Por favor, ingresa el número de WhatsApp a 10 dígitos📱\n\nSi ingresas un número inválido, deberás usar /cuenta para intentar nuevamente.'
    );
  },

  processWhatsAppNumber: async (chatId, text) => {
    if (!cuentaController.state.waitingForWhatsApp.has(chatId)) {
      return false;
    }

    const numero = text.trim();
    
    if (!/^\d{10}$/.test(numero)) {
      await telegramService.sendSafeMessage(
        chatId, 
        '❌ El número ingresado no es válido.\nUsa /cuenta para intentar nuevamente.'
      );
      cuentaController.state.waitingForWhatsApp.delete(chatId);
      return true;
    }

    await telegramService.sendSafeMessage(
      chatId, 
      messageHelper.generateWhatsAppMessage(numero), 
      {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }
    );

    cuentaController.state.waitingForWhatsApp.delete(chatId);
    return true;
  }
};

module.exports = cuentaController;