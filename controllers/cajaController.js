// CajaController.js
const CajaService = require('../services/cajaService');
const { confirmacionesPendientes } = require('../middlewares/auth');

class CajaController {
    constructor(bot) {
        this.bot = bot;
        this.setupCallbacks();
        this.setupMessageHandlers();
    }

    setupCallbacks() {
        this.bot.on('callback_query', async (callbackQuery) => {
            const msg = callbackQuery.message;
            const chatId = msg.chat.id;
            const userId = callbackQuery.from.id;
            const data = callbackQuery.data;

            // Acknowledge the callback
            this.bot.answerCallbackQuery(callbackQuery.id);

            switch (data) {
                case 'verSaldo': {
                    const saldoInfo = await CajaService.obtenerSaldo(chatId);
                    this.bot.sendMessage(chatId, saldoInfo.mensaje, { parse_mode: 'Markdown' });
                    break;
                }

                case 'iniciarCaja':
                    this.bot.sendMessage(
                        chatId, 
                        '🏁 *Iniciar Caja Chica*:\nPor favor, ingresa el monto inicial:', 
                        { parse_mode: 'Markdown' }
                    );
                    confirmacionesPendientes[userId] = { 
                        chatId, 
                        tipo: 'iniciarCaja',
                        timestamp: Date.now()
                    };
                    break;

                case 'agregarDinero':
                    this.bot.sendMessage(
                        chatId, 
                        '➕ *Agregar Dinero*:\n¿Cuánto deseas agregar?', 
                        { parse_mode: 'Markdown' }
                    );
                    confirmacionesPendientes[userId] = { 
                        chatId, 
                        tipo: 'agregarDinero',
                        timestamp: Date.now()
                    };
                    break;

                case 'restarDinero':
                    this.bot.sendMessage(
                        chatId, 
                        '➖ *Restar Dinero*:\n¿Cuánto deseas restar?', 
                        { parse_mode: 'Markdown' }
                    );
                    confirmacionesPendientes[userId] = { 
                        chatId, 
                        tipo: 'restarDinero',
                        timestamp: Date.now()
                    };
                    break;

                case 'eliminarCaja': {
                    const saldoActual = await CajaService.obtenerSaldo(chatId);
                    if (!saldoActual.success) {
                        this.bot.sendMessage(chatId, saldoActual.mensaje);
                        return;
                    }

                    this.bot.sendMessage(
                        chatId,
                        `🚨 *¿Estás seguro de eliminar la caja?*\n` +
                        `Saldo actual: *$${saldoActual.saldo.toFixed(2)}*\n` +
                        'Esta acción no se puede deshacer.',
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
                    confirmacionesPendientes[userId] = { 
                        chatId, 
                        tipo: 'eliminarCaja',
                        timestamp: Date.now()
                    };
                    break;
                }

                case 'confirmarEliminar': {
                    const resultadoEliminar = await CajaService.eliminarCaja(chatId, userId);
                    this.bot.sendMessage(chatId, resultadoEliminar.mensaje, { parse_mode: 'Markdown' });
                    delete confirmacionesPendientes[userId];
                    break;
                }

                case 'cancelar':
                    this.bot.sendMessage(chatId, '🚫 Operación cancelada.');
                    delete confirmacionesPendientes[userId];
                    break;
            }
        });
    }

    setupMessageHandlers() {
        this.bot.on('message', async (msg) => {
            if (msg.text && msg.text.startsWith('/')) return;

            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            if (confirmacionesPendientes[userId]) {
                const { tipo } = confirmacionesPendientes[userId];
                const monto = parseFloat(msg.text);

                // Validar monto
                const validacion = CajaService.validarMonto(monto);
                if (!validacion.esValido) {
                    this.bot.sendMessage(chatId, validacion.mensaje);
                    return;
                }

                let resultado;
                switch (tipo) {
                    case 'iniciarCaja':
                        resultado = await CajaService.iniciarCaja(chatId, monto);
                        this.bot.sendMessage(chatId, resultado.mensaje, { parse_mode: 'Markdown' });
                        break;

                    case 'agregarDinero':
                        resultado = await CajaService.agregarDinero(chatId, monto, userId);
                        this.bot.sendMessage(chatId, resultado.mensaje, { parse_mode: 'Markdown' });
                        break;

                    case 'restarDinero':
                        resultado = await CajaService.restarDinero(chatId, monto, userId);
                        this.bot.sendMessage(chatId, resultado.mensaje, { parse_mode: 'Markdown' });
                        break;
                }

                delete confirmacionesPendientes[userId];
            }
        });
    }
}

module.exports = CajaController;
