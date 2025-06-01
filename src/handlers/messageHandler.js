// src/handlers/messageHandler.js
const bot = require('../config/bot');
const saldoController = require('../controllers/saldoController');
const cuentaController = require('../controllers/cuentaController');
const supervisorController = require('../controllers/supervisorController');
const telegramService = require('../services/telegramService');
const authMiddleware = require('../middleware/authMiddleware');
const messageHelper = require('../utils/messageHelper');
const cajaService = require('../services/cajaService');

const messageHandler = {
  // Helper para crear contexto
  createContext: async (msg) => {
    const ctx = {
      chat: msg.chat,
      from: msg.from,
      message: msg,
    };

    // Adjuntar contexto de usuario y grupo
    await authMiddleware.attachUserContext(ctx, () => {});
    
    return ctx;
  },

  register: () => {
    // Comandos
    bot.onText(/\/saldo/, async (msg) => {
      const ctx = await messageHandler.createContext(msg);
      await saldoController.handleSaldo(ctx);
    });

    bot.onText(/\/cuenta/, async (msg) => {
      const ctx = await messageHandler.createContext(msg);
      await cuentaController.handleCuentaCommand(ctx);
    });

    bot.onText(/\/sup/, async (msg) => {
      const ctx = await messageHandler.createContext(msg);
      
      // Verificar permisos de supervisor
      if (ctx.chat.type === 'private') {
        await telegramService.sendSafeMessage(
          ctx.chat.id,
          '❌ Este comando solo funciona en grupos.'
        );
        return;
      }

      await authMiddleware.requireGroupSupervisor(ctx, async () => {
        await supervisorController.handleSupervisorMenu(ctx);
      });
    });

    // Mensajes de texto
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // Ignorar comandos
      if (msg.text?.startsWith('/')) return;

      // Crear contexto
      const ctx = await messageHandler.createContext(msg);

      // Procesar número de WhatsApp
      if (await cuentaController.processWhatsAppNumber(ctx)) {
        return;
      }

      // NUEVO: Procesar conceptos de gasto pendientes
      if (supervisorController.state.waitingForConcept && 
          supervisorController.state.waitingForConcept[userId]) {
        const concepto = msg.text.trim();
        
        if (!concepto || concepto.length < 3) {
          await telegramService.sendSafeMessage(
            chatId,
            '⚠️ Por favor, ingresa una descripción válida para el gasto (mínimo 3 caracteres).'
          );
          return;
        }
        
        await supervisorController.processConceptAndUpdateSaldo(chatId, userId, concepto);
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