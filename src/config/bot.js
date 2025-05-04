// src/config/bot.js
const TelegramBot = require('node-telegram-bot-api');
const environment = require('./environment');

let bot;

if (environment.server.isProduction) {
  console.log('🌐 Iniciando en modo PRODUCCIÓN - Usando Webhook');
  bot = new TelegramBot(environment.telegram.token, { polling: false });
} else {
  console.log('💻 Iniciando en modo DESARROLLO - Usando Polling');
  bot = new TelegramBot(environment.telegram.token, { polling: true });
}

module.exports = bot;