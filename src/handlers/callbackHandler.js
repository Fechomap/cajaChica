// src/handlers/callbackHandler.js
const bot = require('../config/bot');
const saldoController = require('../controllers/saldoController');
const supervisorController = require('../controllers/supervisorController');
const cuentaController = require('../controllers/cuentaController');

const callbackHandler = {
  register: () => {
    bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;

      await bot.answerCallbackQuery(callbackQuery.id);

      switch(data) {
        case 'verSaldo':
          await saldoController.handleSaldo(chatId, userId);
          break;
        case 'iniciarCaja':
          await supervisorController.initializeCaja(chatId, userId);
          break;
        case 'agregarDinero':
          await supervisorController.addMoney(chatId, userId);
          break;
        case 'restarDinero':
          await supervisorController.subtractMoney(chatId, userId);
          break;
        case 'confirmarAgregar':
          await supervisorController.confirmAddMoney(chatId, userId);
          break;
        case 'confirmarRestar':
          await supervisorController.confirmSubtractMoney(chatId, userId);
          break;
        case 'enviar_whatsapp':
          await cuentaController.startWaitingForWhatsApp(chatId);
          break;
        case 'cancelar':
          await supervisorController.cancelOperation(chatId, userId);
          break;
      }
    });
  }
};

module.exports = callbackHandler;