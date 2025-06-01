// src/jobs/scheduledMessages.js
const cron = require('node-cron');
const bot = require('../config/bot');
const saldoController = require('../controllers/saldoController');

const scheduledMessages = {
  scheduleAutomatedMessages: () => {
    const schedules = ['0 1 * * *', '0 7 * * *', '0 13 * * *', '0 19 * * *'];
    
    console.log('Configurando mensajes automáticos para los horarios:', schedules);

    schedules.forEach(schedule => {
      cron.schedule(schedule, async () => {
        console.log(`⏰ Ejecutando mensaje programado - ${new Date().toLocaleString()}`);
        try {
          // Obtener la organización por defecto y sus grupos activos
          const defaultOrg = await organizationService.getDefaultOrganization();
          const grupos = await groupService.getOrganizationGroups(defaultOrg.id, false);
          console.log(`📊 Encontrados ${grupos.length} grupos para notificar`);
          
          await sendMessagesWithDelay(grupos);
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

async function sendMessagesWithDelay(grupos) {
  console.log(`📊 Iniciando envío de mensajes a ${grupos.length} grupos...`);
  
  for (const [index, grupo] of grupos.entries()) {
    try {
      const chatId = grupo.telegramId.toString();
      console.log(`Enviando mensaje ${index + 1}/${grupos.length} al chat ID: ${chatId}`);
      
      // Enviar saldo si el grupo está inicializado
      if (grupo.isInitialized) {
        await saldoController.handleSaldo(chatId, null);
        
        // Pequeña pausa entre mensajes al mismo grupo
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Mensaje con formato monoespaciado
      const mensaje = 
        '`- Si cuenta con casetas 🚧 o algún gasto por reportar...\n\n' +
        '- Envieme la foto 📸, o la información correspondiente al chat PERSONAL para proceder con el registro de las mismas.\n\n' +
        '- Gracias como siempre! ¡Saludos! ✨👋`';
      
      await bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
      
      console.log(`✅ Mensajes enviados exitosamente al chat ID: ${chatId}`);
      
      if (index < grupos.length - 1) {
        console.log(`⏳ Esperando 10 segundos para el siguiente grupo...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } catch (error) {
      const chatId = grupo.telegramId.toString();
      console.error(`❌ Error enviando mensajes al chat ID ${chatId}:`, error.message);
      
      if (error.response?.parameters?.migrate_to_chat_id) {
        const newChatId = error.response.parameters.migrate_to_chat_id;
        console.log(`🔄 Chat migrado desde ${chatId} a ${newChatId}`);
        try {
          // TODO: Implementar actualización de telegramId en el grupo
          // await groupRepository.update(grupo.id, { telegramId: BigInt(newChatId) });
          
          if (grupo.isInitialized) {
            await saldoController.handleSaldo(newChatId, null);
          }
          
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