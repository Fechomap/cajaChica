require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');

// Usar el token del archivo .env
const token = process.env.TELEGRAM_TOKEN;

// Obtener el nombre de la aplicación en Heroku
const appName = process.env.HEROKU_APP_NAME;

// Construir la URL pública de la aplicación
const url = process.env.APP_URL || (appName ? `https://${appName}.herokuapp.com` : null);

if (!url) {
    console.error('Error: APP_URL no está definido y HEROKU_APP_NAME no está disponible.');
    process.exit(1);
}

const port = process.env.PORT || 3000;

// Crear el bot sin configurar el webhook aún
const bot = new TelegramBot(token);

// Inicializar Express
const app = express();

// Middleware para parsear el cuerpo de las solicitudes
app.use(bodyParser.json());

// Ruta para recibir las actualizaciones de Telegram
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Variable para almacenar los saldos de caja chica por grupo
let cajaChicaPorGrupo = {};

// Usuarios autorizados para manipular la caja chica (supervisores)
const supervisoresAutorizados = [7143094298, 5660087041]; // Reemplaza con los IDs de los supervisores autorizados

// Función para verificar si el usuario es supervisor
function esSupervisor(userId) {
    return supervisoresAutorizados.includes(userId);
}

// Objeto para manejar el estado de las confirmaciones pendientes
let confirmacionesPendientes = {}; // userId: { chatId, tipo, datos }

// Comando /saldo (accesible para todos)
bot.onText(/\/saldo/, (msg) => {
    const chatId = msg.chat.id;

    // Verificar si ya existe una caja chica en el grupo
    if (!cajaChicaPorGrupo[chatId]) {
        bot.sendMessage(chatId, '⚠️ Primero debes iniciar la caja chica con `/iniciarCaja <monto_inicial>`.');
        return;
    }

    bot.sendMessage(chatId, `💰 *Saldo Actual*:\n*${cajaChicaPorGrupo[chatId].toFixed(2)}* pesos.`, { parse_mode: 'Markdown' });
});

// Comando /sup (menú para supervisores)
bot.onText(/\/sup/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!esSupervisor(userId)) {
        bot.sendMessage(chatId, '❌ ¡Ups! No tienes permiso para acceder al menú de supervisores.');
        return;
    }

    const opciones = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🏁 Iniciar Caja', callback_data: 'iniciarCaja' }],
                [{ text: '➕ Agregar Dinero', callback_data: 'agregarDinero' }],
                [{ text: '➖ Restar Dinero', callback_data: 'restarDinero' }],
                [{ text: '💰 Ver Saldo', callback_data: 'verSaldo' }]
            ]
        }
    };

    bot.sendMessage(chatId, '🛠️ *Menú de Supervisores*:\nElige una opción:', { parse_mode: 'Markdown', ...opciones });
});

// Manejar las interacciones del Inline Keyboard
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    // Acknowledge the callback to remove the loading state
    bot.answerCallbackQuery(callbackQuery.id);

    if (data === 'verSaldo') {
        handleSaldo(chatId, userId);
    } else if (data === 'iniciarCaja' && esSupervisor(userId)) {
        iniciarCaja(chatId, userId);
    } else if (data === 'agregarDinero' && esSupervisor(userId)) {
        agregarDinero(chatId, userId);
    } else if (data === 'restarDinero' && esSupervisor(userId)) {
        restarDinero(chatId, userId);
    } else if (data === 'confirmarAgregar' && esSupervisor(userId)) {
        confirmarAgregarDinero(chatId, userId);
    } else if (data === 'confirmarRestar' && esSupervisor(userId)) {
        confirmarRestarDinero(chatId, userId);
    } else if (data === 'cancelar') {
        bot.sendMessage(chatId, '🚫 Operación cancelada.');
        delete confirmacionesPendientes[userId];
    } else {
        bot.sendMessage(chatId, '❌ Opción no válida o no tienes permiso para realizar esta acción.');
    }
});

// Función para manejar la opción "Ver Saldo" (accesible para todos)
function handleSaldo(chatId, userId) {
    // Verificar si ya existe una caja chica en el grupo
    if (!cajaChicaPorGrupo[chatId]) {
        bot.sendMessage(chatId, '⚠️ Primero el supervisor debe iniciar la caja chica.');
        return;
    }

    bot.sendMessage(chatId, `💰 *Saldo Actual*:\n*${cajaChicaPorGrupo[chatId].toFixed(2)}* pesos.`, { parse_mode: 'Markdown' });
}

// Función para iniciar la caja chica (supervisores)
function iniciarCaja(chatId, userId) {
    if (cajaChicaPorGrupo[chatId]) {
        bot.sendMessage(chatId, '⚠️ La caja chica ya ha sido iniciada y no puede reiniciarse.');
        return;
    }

    bot.sendMessage(chatId, '🏁 *Iniciar Caja Chica*:\nPor favor, ingresa el monto inicial:', { parse_mode: 'Markdown' });
    confirmacionesPendientes[userId] = { chatId, tipo: 'iniciarCaja' };
}

// Función para agregar dinero a la caja chica (supervisores)
function agregarDinero(chatId, userId) {
    bot.sendMessage(chatId, '➕ *Agregar Dinero*:\n¿Cuánto deseas agregar?', { parse_mode: 'Markdown' });
    confirmacionesPendientes[userId] = { chatId, tipo: 'agregarDinero' };
}

// Función para restar dinero de la caja chica (supervisores)
function restarDinero(chatId, userId) {
    bot.sendMessage(chatId, '➖ *Restar Dinero*:\n¿Cuánto deseas restar?', { parse_mode: 'Markdown' });
    confirmacionesPendientes[userId] = { chatId, tipo: 'restarDinero' };
}

// Confirmar agregar dinero (supervisores)
function confirmarAgregarDinero(chatId, userId) {
    const confirmacion = confirmacionesPendientes[userId];
    if (confirmacion && confirmacion.tipo === 'agregarDinero') {
        const cantidad = confirmacion.cantidad;
        cajaChicaPorGrupo[chatId] += cantidad;
        cajaChicaPorGrupo[chatId] = parseFloat(cajaChicaPorGrupo[chatId].toFixed(2));
        bot.sendMessage(chatId, `✅ Se han agregado *$${cantidad.toFixed(2)}* pesos. Nuevo saldo: *$${cajaChicaPorGrupo[chatId].toFixed(2)}* pesos. 💵`, { parse_mode: 'Markdown' });
        delete confirmacionesPendientes[userId];
    } else {
        bot.sendMessage(chatId, '⚠️ No hay una acción pendiente de confirmación.');
    }
}

// Confirmar restar dinero (supervisores)
function confirmarRestarDinero(chatId, userId) {
    const confirmacion = confirmacionesPendientes[userId];
    if (confirmacion && confirmacion.tipo === 'restarDinero') {
        const cantidad = confirmacion.cantidad;
        cajaChicaPorGrupo[chatId] -= cantidad;
        cajaChicaPorGrupo[chatId] = parseFloat(cajaChicaPorGrupo[chatId].toFixed(2));
        bot.sendMessage(chatId, `✅ Se han restado *$${cantidad.toFixed(2)}* pesos. Nuevo saldo: *$${cajaChicaPorGrupo[chatId].toFixed(2)}* pesos. 💸`, { parse_mode: 'Markdown' });
        delete confirmacionesPendientes[userId];
    } else {
        bot.sendMessage(chatId, '⚠️ No hay una acción pendiente de confirmación.');
    }
}

// Manejar mensajes de entrada (para cantidades y confirmaciones)
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Evitar procesar mensajes de los comandos
    if (msg.text && msg.text.startsWith('/')) return;

    // Manejar confirmaciones pendientes
    if (confirmacionesPendientes[userId]) {
        const { tipo } = confirmacionesPendientes[userId];

        if (tipo === 'iniciarCaja') {
            const montoInicial = parseFloat(msg.text);
            if (isNaN(montoInicial) || montoInicial <= 0) {
                bot.sendMessage(chatId, '⚠️ Por favor, ingresa una cantidad válida para iniciar la caja chica.');
                return;
            }

            cajaChicaPorGrupo[chatId] = parseFloat(montoInicial.toFixed(2));
            bot.sendMessage(chatId, `✅ Se ha iniciado la caja chica con *$${cajaChicaPorGrupo[chatId].toFixed(2)}* pesos. 💰`, { parse_mode: 'Markdown' });

            delete confirmacionesPendientes[userId];
        } else if (tipo === 'agregarDinero') {
            const cantidad = parseFloat(msg.text);
            if (isNaN(cantidad) || cantidad <= 0) {
                bot.sendMessage(chatId, '⚠️ Por favor, ingresa una cantidad válida para agregar.');
                return;
            }

            // Guardar la cantidad para la confirmación
            confirmacionesPendientes[userId].cantidad = cantidad;

            // Confirmación con botones inline
            const opciones = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Sí', callback_data: 'confirmarAgregar' },
                            { text: '❌ No', callback_data: 'cancelar' }
                        ]
                    ]
                },
                parse_mode: 'Markdown'
            };

            bot.sendMessage(chatId, `¿Estás seguro de que deseas agregar *$${cantidad.toFixed(2)}* pesos a la caja chica?`, opciones);
        } else if (tipo === 'restarDinero') {
            const cantidad = parseFloat(msg.text);
            if (isNaN(cantidad) || cantidad <= 0) {
                bot.sendMessage(chatId, '⚠️ Por favor, ingresa una cantidad válida para restar.');
                return;
            }

            // Verificar que la cantidad no exceda el saldo actual
            if (cantidad > cajaChicaPorGrupo[chatId]) {
                bot.sendMessage(chatId, `⚠️ No puedes restar una cantidad mayor al saldo actual de la caja chica (*$${cajaChicaPorGrupo[chatId].toFixed(2)}* pesos).`);
                return;
            }

            // Guardar la cantidad para la confirmación
            confirmacionesPendientes[userId].cantidad = cantidad;

            // Confirmación con botones inline
            const opciones = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Sí', callback_data: 'confirmarRestar' },
                            { text: '❌ No', callback_data: 'cancelar' }
                        ]
                    ]
                },
                parse_mode: 'Markdown'
            };

            bot.sendMessage(chatId, `¿Estás seguro de que deseas restar *$${cantidad.toFixed(2)}* pesos de la caja chica?`, opciones);
        }
    }
});

// Iniciar el servidor y configurar el webhook
app.listen(port, () => {
    console.log(`Bot de Telegram escuchando en el puerto ${port}`);

    // Configurar el webhook después de que el servidor esté listo
    bot.setWebHook(`${url}/bot${token}`)
        .then(() => {
            console.log(`Webhook configurado correctamente: ${url}/bot${token}`);
        })
        .catch(err => {
            console.error('Error al configurar el webhook:', err);
        });
});
