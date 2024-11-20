const CajaService = require('../services/cajaService');
const { esSupervisor } = require('../middlewares/auth');
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

        // Comando /sup (menú para supervisores)
        this.bot.onText(/\/sup/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            if (!esSupervisor(userId)) {
                this.bot.sendMessage(chatId, '❌ ¡Ups! No tienes permiso para acceder al menú de supervisores.');
                return;
            }

            this.bot.sendMessage(chatId, '🛠️ *Menú de Supervisores*:\nElige una opción:', { 
                parse_mode: 'Markdown',
                ...menuOptions.supervisor 
            });
        });
    }

    // Método para registrar los comandos en BotFather
    async registerCommands() {
        const commands = [
            { command: 'saldo', description: 'Ver saldo actual de la caja' },
            { command: 'sup', description: 'Menú de supervisores' }
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