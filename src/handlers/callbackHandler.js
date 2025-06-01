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
          // Usar el método viewBalance del supervisorController que funciona con chatId
          await supervisorController.viewBalance(chatId, userId);
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
          const confirmDataAdd = supervisorController.state.pendingConfirmations[userId];
          if (confirmDataAdd && confirmDataAdd.cantidad && confirmDataAdd.concepto) {
            await supervisorController.confirmAddMoney(chatId, userId, confirmDataAdd.cantidad, confirmDataAdd.concepto);
          }
          break;
        case 'confirmarRestar':
          const confirmDataSub = supervisorController.state.pendingConfirmations[userId];
          if (confirmDataSub && confirmDataSub.cantidad && confirmDataSub.concepto) {
            await supervisorController.confirmSubtractMoney(chatId, userId, confirmDataSub.cantidad, confirmDataSub.concepto);
          }
          break;
        case 'enviar_whatsapp':
          const ctx = {
            chat: { id: chatId },
            from: { id: userId }
          };
          await cuentaController.startWaitingForWhatsApp(ctx);
          break;
        case 'cancelar':
          await supervisorController.cancelOperation(chatId, userId);
          break;
      }
    });
  }
};

module.exports = callbackHandler;