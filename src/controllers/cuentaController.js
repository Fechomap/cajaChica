// src/controllers/cuentaController.js
const messageHelper = require('../utils/messageHelper');
const telegramService = require('../services/telegramService');
const organizationService = require('../services/organizationService');
const stateService = require('../services/stateService');

const cuentaController = {
  handleCuentaCommand: async (ctx) => {
    try {
      const chatId = ctx.chat.id;
      
      // Obtener información bancaria de la organización
      let bankMessage;
      
      if (ctx.userContext?.organization?.bankInfo) {
        const bankInfo = ctx.userContext.organization.bankInfo;
        bankMessage = messageHelper.generateBankAccountMessageFromOrg(bankInfo);
      } else {
        // Usar mensaje por defecto si no hay información configurada
        bankMessage = messageHelper.generateBankAccountMessage();
      }

      await telegramService.sendSafeMessage(
        chatId, 
        bankMessage, 
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "Enviar a WhatsApp 📦", callback_data: 'enviar_whatsapp' }]
            ]
          }
        }
      );
    } catch (error) {
      console.error('Error en handleCuentaCommand:', error);
      await telegramService.sendSafeMessage(
        ctx.chat.id,
        '❌ Error al obtener información bancaria.'
      );
    }
  },

  startWaitingForWhatsApp: async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    
    // Usar servicio de estado para manejar estados temporales
    await stateService.setState(userId, 'waitingForWhatsApp', { chatId });
    
    await telegramService.sendSafeMessage(
      chatId, 
      'Por favor, ingresa el número de WhatsApp a 10 dígitos📱\n\nSi ingresas un número inválido, deberás usar /cuenta para intentar nuevamente.'
    );
  },

  processWhatsAppNumber: async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const text = ctx.message.text;

    // Verificar si el usuario está esperando un número
    const state = await stateService.getState(userId, 'waitingForWhatsApp');
    
    if (!state) {
      return false;
    }

    const numero = text.trim();
    
    if (!/^\d{10}$/.test(numero)) {
      await telegramService.sendSafeMessage(
        chatId, 
        '❌ El número ingresado no es válido.\nUsa /cuenta para intentar nuevamente.'
      );
      await stateService.clearState(userId, 'waitingForWhatsApp');
      return true;
    }

    // Generar mensaje con información bancaria
    let whatsappMessage;
    
    if (ctx.userContext?.organization?.bankInfo) {
      const bankInfo = ctx.userContext.organization.bankInfo;
      whatsappMessage = messageHelper.generateWhatsAppMessageFromOrg(numero, bankInfo);
    } else {
      whatsappMessage = messageHelper.generateWhatsAppMessage(numero);
    }

    await telegramService.sendSafeMessage(
      chatId, 
      whatsappMessage, 
      {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }
    );

    await stateService.clearState(userId, 'waitingForWhatsApp');
    return true;
  }
};

module.exports = cuentaController;