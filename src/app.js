// src/app.js
const express = require('express');
const bot = require('./config/bot');
const environment = require('./config/environment');
const { connectDB, disconnectDB } = require('./config/database');
const webhookHelper = require('./utils/webhookHelper');
const webhookRoutes = require('./routes/webhookRoutes');
const messageHandler = require('./handlers/messageHandler');
const callbackHandler = require('./handlers/callbackHandler');
const scheduledMessages = require('./jobs/scheduledMessages');

// Crear instancia de Express
const app = express();

// Middleware
app.use(express.json());

// Registrar rutas
app.use('/', webhookRoutes);

// Registrar manejadores
messageHandler.register();
callbackHandler.register();

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();

    if (environment.server.isProduction) {
      const webhookUrl = environment.webhook.url;
      
      app.listen(environment.server.port, () => {
        console.log(`Servidor escuchando en el puerto ${environment.server.port}`);
        console.log('Intentando configurar webhook en:', webhookUrl);
        
        // Configurar webhook inicial
        webhookHelper.setupWebhook(bot, webhookUrl);
        
        // Verificar webhook cada hora
        setInterval(() => {
          webhookHelper.setupWebhook(bot, webhookUrl);
        }, 3600000);
        
        // Iniciar tareas programadas
        scheduledMessages.scheduleAutomatedMessages();
        console.log('Mensajes automáticos programados');
      });
    } else {
      // Modo desarrollo (polling)
      scheduledMessages.scheduleAutomatedMessages();
      console.log('Mensajes automáticos programados');
    }
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejadores de señales del proceso
process.on('SIGTERM', async () => {
  console.log('Recibida señal SIGTERM, cerrando servidor...');
  if (environment.server.isProduction) {
    await bot.deleteWebHook();
  }
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Recibida señal SIGINT, cerrando servidor...');
  if (environment.server.isProduction) {
    await bot.deleteWebHook();
  }
  await disconnectDB();
  process.exit(0);
});

module.exports = { app, startServer };