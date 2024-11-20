// CommandController.js
const CajaService = require('../services/cajaService');
const { esSupervisor, verificarSupervisor } = require('../middlewares/auth');
const { menuOptions } = require('../config/bot');

class CommandController {
   constructor(bot) {
       this.bot = bot;
       this.setupCommands();
   }

   setupCommands() {
       // Comando /saldo
       this.bot.onText(/\/saldo/, async (msg) => {
           const chatId = msg.chat.id;
           const response = await CajaService.obtenerSaldo(chatId);
           this.bot.sendMessage(chatId, response.mensaje, { parse_mode: 'Markdown' });
       });

       // Comando /sup
       this.bot.onText(/\/sup/, (msg) => {
           const chatId = msg.chat.id;
           const userId = msg.from.id;
           
           if (!verificarSupervisor(userId, chatId, this.bot)) return;

           this.bot.sendMessage(chatId, '🛠️ *Menú de Supervisores*:\nElige una opción:', { 
               parse_mode: 'Markdown',
               ...menuOptions.supervisor 
           });
       });
   }

   async registerCommands() {
       const commands = [
           { command: 'saldo', description: 'Ver saldo actual de la caja' },
           { command: 'sup', description: 'Menú de supervisores (acceso restringido)' }
       ];

       try {
           await this.bot.setMyCommands(commands);
           console.log('✅ Comandos registrados exitosamente');
       } catch (error) {
           console.error('❌ Error al registrar comandos:', error);
       }
   }
}

module.exports = CommandController;
