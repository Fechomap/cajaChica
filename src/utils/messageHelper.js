// src/utils/messageHelper.js
const messageHelper = {
    generateBankAccountMessage: () => {
      return `
  CUENTA BBVA:
  
  **Nombre:** Alfredo Alejandro Perez Aguilar
  
  **Cuenta:** 1582680561
  
  **CLABE:** 012180015826805612
  
  **T débito:** 4152314307139520
  `;
    },

    generateBankAccountMessageFromOrg: (bankInfo) => {
      return `
  CUENTA ${bankInfo.bankName || 'BANCARIA'}:
  
  **Nombre:** ${bankInfo.accountHolder}
  
  **Cuenta:** ${bankInfo.accountNumber}
  
  ${bankInfo.clabe ? `**CLABE:** ${bankInfo.clabe}\n` : ''}
  ${bankInfo.debitCard ? `**T débito:** ${bankInfo.debitCard}` : ''}
  `;
    },
  
    generateWhatsAppMessage: (number) => {
      const mensajeWhatsApp = encodeURIComponent(`\`\`\`
  CUENTA BBVA:
  
  Nombre: Alfredo Alejandro Perez Aguilar
  
  Cuenta: 1582680561
  
  CLABE: 012180015826805612
  
  T débito: 4152314307139520
  \`\`\``);
  
      const whatsappUrl = `https://wa.me/52${number}?text=${mensajeWhatsApp}`;
  
      return `✅ Número capturado: **${number}**\n\n[Enviar datos a WhatsApp](${whatsappUrl})`;
    },

    generateWhatsAppMessageFromOrg: (number, bankInfo) => {
      const mensajeWhatsApp = encodeURIComponent(`\`\`\`
  CUENTA ${bankInfo.bankName || 'BANCARIA'}:
  
  Nombre: ${bankInfo.accountHolder}
  
  Cuenta: ${bankInfo.accountNumber}
  
  ${bankInfo.clabe ? `CLABE: ${bankInfo.clabe}\n` : ''}
  ${bankInfo.debitCard ? `T débito: ${bankInfo.debitCard}` : ''}
  \`\`\``);
  
      const whatsappUrl = `https://wa.me/52${number}?text=${mensajeWhatsApp}`;
  
      return `✅ Número capturado: **${number}**\n\n[Enviar datos a WhatsApp](${whatsappUrl})`;
    },
  
    getSupervisorMenu: () => {
      return {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏁 Iniciar Caja', callback_data: 'iniciarCaja' }],
            [{ text: '➕ Agregar Dinero', callback_data: 'agregarDinero' }],
            [{ text: '➖ Restar Dinero', callback_data: 'restarDinero' }],
            [{ text: '💰 Ver Saldo', callback_data: 'verSaldo' }]
          ]
        }
      };
    },
  
    getConfirmationKeyboard: (confirmAction) => {
      return {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Sí', callback_data: confirmAction },
              { text: '❌ No', callback_data: 'cancelar' }
            ]
          ]
        },
        parse_mode: 'Markdown'
      };
    }
  };
  
  module.exports = messageHelper;