// src/handlers/messageHandler.js
const bot = require('../config/bot');
const saldoController = require('../controllers/saldoController');
const cuentaController = require('../controllers/cuentaController');
const supervisorController = require('../controllers/supervisorController');
const cajaService = require('../services/cajaService');
const telegramService = require('../services/telegramService');
const messageHelper = require('../utils/messageHelper');

const messageHandler = {
  register: () => {
    // Comandos
    bot.onText(/\/saldo/, async (msg) => {
      const chatId = msg.chat.id;
      await saldoController.handleSaldo(chatId, msg.from.id);
    });

    bot.onText(/\/cuenta/, async (msg) => {
      const chatId = msg.chat.id;
      await cuentaController.handleCuentaCommand(chatId);
    });

    bot.onText(/\/sup/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      await supervisorController.handleSupervisorMenu(chatId, userId);
    });

    // Mensajes de texto
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // Ignorar comandos
      if (msg.text?.startsWith('/')) return;

      // Procesar número de WhatsApp
      if (await cuentaController.processWhatsAppNumber(chatId, msg.text)) {
        return;
      }

      // Procesar confirmaciones pendientes
      const confirmation = supervisorController.state.pendingConfirmations[userId];
      if (confirmation) {
        const { tipo } = confirmation;

        if (tipo === 'iniciarCaja') {
          const montoInicial = parseFloat(msg.text);
          if (isNaN(montoInicial) || montoInicial <= 0) {
            await telegramService.sendSafeMessage(
              chatId, 
              '⚠️ Por favor, ingresa una cantidad válida para iniciar la caja chica.'
            );
            return;
          }

          await cajaService.createCaja(chatId, montoInicial);
          await telegramService.sendSafeMessage(
            chatId, 
            `✅ Se ha iniciado la caja chica con *$${montoInicial.toFixed(2)}* pesos. 💰`, 
            { parse_mode: 'Markdown' }
          );
          delete supervisorController.state.pendingConfirmations[userId];
        }
        
        else if (tipo === 'agregarDinero') {
          const cantidad = parseFloat(msg.text);
          if (isNaN(cantidad) || cantidad <= 0) {
            await telegramService.sendSafeMessage(
              chatId, 
              '⚠️ Por favor, ingresa una cantidad válida para agregar.'
            );
            return;
          }

          supervisorController.state.pendingConfirmations[userId].cantidad = cantidad;
          
          await telegramService.sendSafeMessage(
            chatId, 
            `¿Estás seguro de que deseas agregar *$${cantidad.toFixed(2)}* pesos a la caja chica?`, 
            messageHelper.getConfirmationKeyboard('confirmarAgregar')
          );
        }
        
        else if (tipo === 'restarDinero') {
          const cantidad = parseFloat(msg.text);
          if (isNaN(cantidad) || cantidad <= 0) {
            await telegramService.sendSafeMessage(
              chatId, 
              '⚠️ Por favor, ingresa una cantidad válida para restar.'
            );
            return;
          }

          const caja = await cajaService.findCaja(chatId);
          if (!caja) {
            await telegramService.sendSafeMessage(
              chatId, 
              '⚠️ La caja chica no ha sido iniciada.'
            );
            return;
          }

          if (cantidad > caja.saldo) {
            await telegramService.sendSafeMessage(
              chatId, 
              `⚠️ No puedes restar una cantidad mayor al saldo actual de la caja chica (*$${caja.saldo.toFixed(2)}* pesos).`
            );
            return;
          }

          supervisorController.state.pendingConfirmations[userId].cantidad = cantidad;
          
          await telegramService.sendSafeMessage(
            chatId, 
            `¿Estás seguro de que deseas restar *$${cantidad.toFixed(2)}* pesos de la caja chica?`, 
            messageHelper.getConfirmationKeyboard('confirmarRestar')
          );
        }
      }
    });
  }
};

module.exports = messageHandler;