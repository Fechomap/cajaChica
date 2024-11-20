require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Validar variables de entorno requeridas
if (!process.env.TELEGRAM_TOKEN) {
    console.error('❌ Error: TELEGRAM_TOKEN no está definido en el archivo .env');
    process.exit(1);
}

if (!process.env.APP_URL) {
    console.error('❌ Error: APP_URL no está definido en el archivo .env');
    process.exit(1);
}

// Configuración del bot
const token = process.env.TELEGRAM_TOKEN;
const url = process.env.APP_URL.replace(/\/$/, ''); // Elimina la barra final si existe

// Crear el bot con polling deshabilitado
const bot = new TelegramBot(token, { polling: false });

// Configurar webhook
const setupWebhook = async () => {
    try {
        const webhookUrl = `${url}/bot${token}`;
        await bot.setWebHook(webhookUrl);
        console.log(`✅ Webhook configurado: ${webhookUrl}`);
        return true;
    } catch (error) {
        console.error('❌ Error al configurar webhook:', error);
        return false;
    }
};

// Mensajes predefinidos
const messages = {
    unauthorized: '❌ No tienes permiso para realizar esta acción.',
    cajaNotFound: '⚠️ No se encontró la caja chica.',
    invalidAmount: '⚠️ Por favor, ingresa un monto válido.',
    operationSuccess: '✅ Operación realizada con éxito.',
    operationError: '❌ Error al procesar la operación.'
};

// Configuración de menús
const menuOptions = {
    supervisor: {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🏁 Iniciar Caja', callback_data: 'iniciarCaja' }],
                [{ text: '➕ Agregar Dinero', callback_data: 'agregarDinero' }],
                [{ text: '➖ Restar Dinero', callback_data: 'restarDinero' }],
                [{ text: '💰 Ver Saldo', callback_data: 'verSaldo' }],
                [{ text: '✏️ Modificar Saldo', callback_data: 'modificarSaldo' }],
                [{ text: '🗑️ Eliminar Caja', callback_data: 'eliminarCaja' }]
            ]
        }
    }
};

module.exports = {
    bot,
    setupWebhook,
    messages,
    menuOptions,
    token
};