// src/services/telegramService.js
const bot = require('../config/bot');
const groupRepository = require('../repositories/groupRepository');
const { Decimal } = require('@prisma/client/runtime/library');

const telegramService = {
  sendSafeMessage: async (chatId, text, options = {}) => {
    try {
      return await bot.sendMessage(chatId, text, options);
    } catch (error) {
      if (error.response?.parameters?.migrate_to_chat_id) {
        const newChatId = error.response.parameters.migrate_to_chat_id;
        console.log(`🔄 Chat migrado: ${chatId} -> ${newChatId}`);
        
        try {
          // Actualizar el ID del chat en la base de datos
          const group = await groupRepository.findByTelegramId(chatId);
          if (group) {
            await groupRepository.update(group.id, { telegramId: newChatId });
          }
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
    // Convertir Decimal a número para formatear
    const saldoNum = saldo instanceof Decimal ? parseFloat(saldo.toString()) : saldo;
    const message = `💰 *Saldo Actual*:\n*${saldoNum.toFixed(2)}* pesos.`;
    return await telegramService.sendSafeMessage(chatId, message, { parse_mode: 'Markdown' });
  },

  sendOperationConfirmation: async (chatId, operation, amount, newSaldo) => {
    // Convertir Decimal a número para formatear
    const amountNum = amount instanceof Decimal ? parseFloat(amount.toString()) : amount;
    const saldoNum = newSaldo instanceof Decimal ? parseFloat(newSaldo.toString()) : newSaldo;
    
    const messages = {
      add: `✅ Se han agregado *$${amountNum.toFixed(2)}* pesos. Nuevo saldo: *$${saldoNum.toFixed(2)}* pesos. 💵`,
      subtract: `✅ Se han restado *$${amountNum.toFixed(2)}* pesos. Nuevo saldo: *$${saldoNum.toFixed(2)}* pesos. 💸`,
      income: `✅ Se han agregado *$${amountNum.toFixed(2)}* pesos. Nuevo saldo: *$${saldoNum.toFixed(2)}* pesos. 💵`,
      expense: `✅ Se han restado *$${amountNum.toFixed(2)}* pesos. Nuevo saldo: *$${saldoNum.toFixed(2)}* pesos. 💸`
    };
    
    return await telegramService.sendSafeMessage(chatId, messages[operation], { parse_mode: 'Markdown' });
  },

  sendTransactionSummary: async (chatId, summary) => {
    const incomeNum = parseFloat(summary.totalIncome.toString());
    const expenseNum = parseFloat(summary.totalExpense.toString());
    const netNum = parseFloat(summary.netFlow.toString());
    
    const message = `📊 *Resumen del Período*
    
💵 *Ingresos:* $${incomeNum.toFixed(2)}
💸 *Gastos:* $${expenseNum.toFixed(2)}
📈 *Neto:* $${netNum.toFixed(2)}
🔢 *Transacciones:* ${summary.transactionCount}`;
    
    return await telegramService.sendSafeMessage(chatId, message, { parse_mode: 'Markdown' });
  }
};

module.exports = telegramService;