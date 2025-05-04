// src/utils/webhookHelper.js
const webhookHelper = {
    setupWebhook: async (botInstance, webhookUrl) => {
      try {
        const webhookInfo = await botInstance.getWebHookInfo();
        console.log('🔍 Webhook info antes de configurar:', JSON.stringify(webhookInfo, null, 2));
        
        if (!webhookInfo.url || webhookInfo.url !== webhookUrl) {
          console.log('⚠️ Webhook diferente o vacío. Configurando...');
          
          console.log('🔄 Eliminando webhook actual...');
          const deleteResult = await botInstance.deleteWebHook();
          console.log('🔄 Resultado de eliminar webhook:', deleteResult);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!webhookUrl.startsWith('https://')) {
            throw new Error(`URL del webhook inválida: ${webhookUrl}`);
          }
  
          console.log('✨ Configurando nuevo webhook con URL:', webhookUrl);
          
          const setWebhookResult = await botInstance.setWebHook(webhookUrl, {
            max_connections: 100,
            drop_pending_updates: true
          });
          
          console.log('✅ Resultado de setWebHook:', setWebhookResult);
          
          const newWebhookInfo = await botInstance.getWebHookInfo();
          console.log('🔍 Webhook info DESPUÉS de configurar:', JSON.stringify(newWebhookInfo, null, 2));
          
          if (newWebhookInfo.url === webhookUrl) {
            console.log(`✅ Webhook configurado correctamente en: ${webhookUrl}`);
          } else {
            throw new Error(`La verificación del webhook falló. URL esperada: ${webhookUrl}, URL actual: ${newWebhookInfo.url}`);
          }
        } else {
          console.log('✅ Webhook ya está correctamente configurado en:', webhookInfo.url);
        }
      } catch (error) {
        console.error('❌ Error al configurar el webhook:', error);
        console.log('🔍 Error detallado:', error.message);
        console.log('🔍 Stack trace:', error.stack);
        console.log('URL que causó el error:', webhookUrl);
        console.log('Reintentando en 30 segundos...');
        setTimeout(() => this.setupWebhook(botInstance, webhookUrl), 30000);
      }
    }
  };
  
  module.exports = webhookHelper;