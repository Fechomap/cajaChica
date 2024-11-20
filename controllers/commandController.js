// commandControllers.js
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

       // Manejador de callbacks
       this.bot.on('callback_query', async (callbackQuery) => {
           const chatId = callbackQuery.message.chat.id;
           const userId = callbackQuery.from.id;
           const action = callbackQuery.data;

           if (['iniciarCaja', 'eliminarCaja'].includes(action)) {
               if (!verificarSupervisor(userId, chatId, this.bot)) return;
           }

           switch (action) {
               case 'verSaldo':
                   const saldo = await CajaService.obtenerSaldo(chatId);
                   this.bot.sendMessage(chatId, saldo.mensaje);
                   break;
               case 'iniciarCaja':
                   this.bot.sendMessage(
                       chatId,
                       '🏁 *Iniciar Caja Chica*:\nPor favor, ingresa el monto inicial:',
                       { parse_mode: 'Markdown' }
                   );
                   break;
               case 'agregarDinero':
                   this.bot.sendMessage(
                       chatId,
                       '➕ *Agregar Dinero*:\n¿Cuánto deseas agregar?',
                       { parse_mode: 'Markdown' }
                   );
                   break;
               case 'restarDinero':
                   this.bot.sendMessage(
                       chatId,
                       '➖ *Restar Dinero*:\n¿Cuánto deseas restar?',
                       { parse_mode: 'Markdown' }
                   );
                   break;
               case 'eliminarCaja':
                   this.bot.sendMessage(
                       chatId,
                       '🗑️ *¿Estás seguro de eliminar la caja?*\nEsta acción no se puede deshacer.',
                       {
                           parse_mode: 'Markdown',
                           reply_markup: {
                               inline_keyboard: [
                                   [
                                       { text: '✅ Sí, eliminar', callback_data: 'confirmarEliminar' },
                                       { text: '❌ No, cancelar', callback_data: 'cancelar' }
                                   ]
                               ]
                           }
                       }
                   );
                   break;
               case 'confirmarEliminar':
                   const resultadoEliminar = await CajaService.eliminarCaja(chatId);
                   this.bot.sendMessage(chatId, resultadoEliminar.mensaje);
                   break;
               case 'cancelar':
                   this.bot.sendMessage(chatId, '🚫 Operación cancelada');
                   break;
           }
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