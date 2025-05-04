// src/jobs/scheduledMessages.js
const cron = require('node-cron');
const bot = require('../config/bot');
const cajaService = require('../services/cajaService');
const saldoController = require('../controllers/saldoController');

const scheduledMessages = {
  scheduleAutomatedMessages: () => {
    const schedules = ['0 1 * * *', '0 7 * * *', '0 13 * * *', '0 19 * * *'];
    
    console.log('Configurando mensajes automáticos para los horarios:', schedules);

    schedules.forEach(schedule => {
      cron.schedule(schedule, async () => {
        console.log(`⏰ Ejecutando mensaje programado - ${new Date().toLocaleString()}`);
        try {
          const cajas = await cajaService.findAllCajas();
          console.log(`📊 Encontradas ${cajas.length} cajas para notificar`);
          
          await sendMessagesWithDelay(cajas);
        } catch (error) {
          console.error('❌ Error general en el envío de mensajes:', error.message);
        }
      }, {
        timezone: "America/Mexico_City",
        scheduled: true
      });
    });

    console.log('✅ Sistema de mensajes automáticos configurado correctamente');
  }
};

async function sendMessagesWithDelay(cajas) {
  console.log(`📊 Iniciando envío de mensajes a ${cajas.length} grupos...`);
  
  for (const [index, caja] of cajas.entries()) {
    try {
      console.log(`Enviando mensaje ${index + 1}/${cajas.length} al chat ID: ${caja.chatId}`);
      
      // Enviar saldo
      await saldoController.handleSaldo(caja.chatId, null);
      
      // Pequeña pausa entre mensajes al mismo grupo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mensaje con formato monoespaciado
      const mensaje = 
        '`- Si cuenta con casetas 🚧 o algún gasto por reportar...\n\n' +
        '- Envieme la foto 📸, o la información correspondiente al chat PERSONAL para proceder con el registro de las mismas.\n\n' +
        '- Gracias como siempre! ¡Saludos! ✨👋`';
      
      await bot.sendMessage(caja.chatId, mensaje, { parse_mode: 'Markdown' });
      
      console.log(`✅ Mensajes enviados exitosamente al chat ID: ${caja.chatId}`);
      
      if (index < cajas.length - 1) {
        console.log(`⏳ Esperando 10 segundos para el siguiente grupo...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error(`❌ Error enviando mensajes al chat ID ${caja.chatId}:`, error.message);
      
      if (error.response?.parameters?.migrate_to_chat_id) {
        const newChatId = error.response.parameters.migrate_to_chat_id;
        console.log(`🔄 Actualizando chat ID ${caja.chatId} a ${newChatId}`);
        try {
          await cajaService.updateChatId(caja.chatId, newChatId);
          await saldoController.handleSaldo(newChatId, null);
          
          const mensaje = 
            '`- Si cuenta con casetas 🚧 o algún gasto por reportar...\n\n' +
            '- Envieme la foto 📸, o la información correspondiente al chat PERSONAL para proceder con el registro de las mismas.\n\n' +
            '- Gracias como siempre! ¡Saludos! ✨👋`';
          
          await bot.sendMessage(newChatId, mensaje, { parse_mode: 'Markdown' });
        } catch (updateError) {
          console.error(`Error actualizando/reenviando al nuevo chat ID:`, updateError);
        }
      }
    }
  }
  
  console.log('✅ Proceso de envío de mensajes completado');
}

module.exports = scheduledMessages;