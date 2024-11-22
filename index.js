// 1. PRIMERO - Importaciones
require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// 2. SEGUNDO - Configuraciones básicas
const token = process.env.TELEGRAM_TOKEN;
const url = process.env.APP_URL.replace(/\/$/, '');
const port = process.env.PORT || 3000;

// 3. TERCERO - Validaciones de variables de entorno
if (!token) {
    console.error('Error: TELEGRAM_TOKEN no está definido en el archivo .env');
    process.exit(1);
}

if (!url) {
    console.error('Error: APP_URL no está definido en el archivo .env');
    process.exit(1);
}

// 4. CUARTO - Función de configuración del webhook (agregar ANTES de crear el bot)
async function setupWebhook(bot, webhookUrl) {
    try {
        const webhookInfo = await bot.getWebHookInfo();
        
        if (!webhookInfo.url || webhookInfo.url !== webhookUrl) {
            console.log('Configurando webhook...');
            await bot.deleteWebHook();
            await bot.setWebHook(webhookUrl, {
                max_connections: 100,
                drop_pending_updates: true
            });
            
            const newWebhookInfo = await bot.getWebHookInfo();
            if (newWebhookInfo.url === webhookUrl) {
                console.log(`Webhook configurado correctamente en: ${webhookUrl}`);
            } else {
                throw new Error('La verificación del webhook falló');
            }
        } else {
            console.log('Webhook ya está correctamente configurado');
        }
    } catch (error) {
        console.error('Error al configurar el webhook:', error);
        console.log('Reintentando en 30 segundos...');
        setTimeout(() => setupWebhook(bot, webhookUrl), 30000);
    }
}

// 5. QUINTO - Crear el bot
const bot = new TelegramBot(token, { polling: false });

// 6. SEXTO - Configurar Express
const app = express();
app.use(bodyParser.json());

// 7. SÉPTIMO - Importar el modelo (mantén esta línea donde ya la tienes)
const CajaChica = require('./models/CajaChica');

// 8. OCTAVO - Agregar ruta de salud (después de configurar express y antes de la ruta del bot)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 9. NOVENO - Ruta del webhook (mantén esta parte)
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// 10. DÉCIMO - Función de inicio del servidor (agregar DESPUÉS de todas las rutas y ANTES de los manejadores de comandos)
async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado a MongoDB');

        app.listen(port, () => {
            console.log(`Servidor escuchando en el puerto ${port}`);
            
            const webhookUrl = `${url}/bot${token}`;
            setupWebhook(bot, webhookUrl);
            
            setInterval(() => {
                setupWebhook(bot, webhookUrl);
            }, 3600000);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// 11. UNDÉCIMO - Manejadores de señales (agregar DESPUÉS de startServer y ANTES de los manejadores de comandos)
process.on('SIGTERM', async () => {
    console.log('Recibida señal SIGTERM, cerrando servidor...');
    await bot.deleteWebHook();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Recibida señal SIGINT, cerrando servidor...');
    await bot.deleteWebHook();
    process.exit(0);
});


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
    handleSaldo(chatId, msg.from.id);
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
    CajaChica.findOne({ chatId })
        .then(caja => {
            if (!caja) {
                bot.sendMessage(chatId, '⚠️ Primero el supervisor debe iniciar la caja chica.');
                return;
            }

            bot.sendMessage(chatId, `💰 *Saldo Actual*:\n*${caja.saldo.toFixed(2)}* pesos.`, { parse_mode: 'Markdown' });
        })
        .catch(err => {
            console.error('Error al obtener el saldo:', err);
            bot.sendMessage(chatId, '❌ Error al obtener el saldo.');
        });
}

// Función para iniciar la caja chica (supervisores)
function iniciarCaja(chatId, userId) {
    CajaChica.findOne({ chatId })
        .then(caja => {
            if (caja) {
                bot.sendMessage(chatId, '⚠️ La caja chica ya ha sido iniciada y no puede reiniciarse.');
                return;
            }

            bot.sendMessage(chatId, '🏁 *Iniciar Caja Chica*:\nPor favor, ingresa el monto inicial:', { parse_mode: 'Markdown' });
            confirmacionesPendientes[userId] = { chatId, tipo: 'iniciarCaja' };
        })
        .catch(err => {
            console.error('Error al buscar caja chica:', err);
            bot.sendMessage(chatId, '❌ Error al iniciar la caja chica.');
        });
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
        CajaChica.findOne({ chatId })
            .then(caja => {
                if (!caja) {
                    bot.sendMessage(chatId, '⚠️ La caja chica no ha sido iniciada.');
                    return;
                }

                caja.saldo += cantidad;
                caja.save()
                    .then(() => {
                        bot.sendMessage(chatId, `✅ Se han agregado *$${cantidad.toFixed(2)}* pesos. Nuevo saldo: *$${caja.saldo.toFixed(2)}* pesos. 💵`, { parse_mode: 'Markdown' });
                        delete confirmacionesPendientes[userId];
                    })
                    .catch(err => {
                        console.error('Error al actualizar el saldo:', err);
                        bot.sendMessage(chatId, '❌ Error al actualizar el saldo.');
                    });
            })
            .catch(err => {
                console.error('Error al buscar la caja chica:', err);
                bot.sendMessage(chatId, '❌ Error al agregar dinero.');
            });
    } else {
        bot.sendMessage(chatId, '⚠️ No hay una acción pendiente de confirmación.');
    }
}

// Confirmar restar dinero (supervisores)
function confirmarRestarDinero(chatId, userId) {
    const confirmacion = confirmacionesPendientes[userId];
    if (confirmacion && confirmacion.tipo === 'restarDinero') {
        const cantidad = confirmacion.cantidad;
        CajaChica.findOne({ chatId })
            .then(caja => {
                if (!caja) {
                    bot.sendMessage(chatId, '⚠️ La caja chica no ha sido iniciada.');
                    return;
                }

                if (cantidad > caja.saldo) {
                    bot.sendMessage(chatId, `⚠️ No puedes restar una cantidad mayor al saldo actual de la caja chica (*$${caja.saldo.toFixed(2)}* pesos).`);
                    return;
                }

                caja.saldo -= cantidad;
                caja.save()
                    .then(() => {
                        bot.sendMessage(chatId, `✅ Se han restado *$${cantidad.toFixed(2)}* pesos. Nuevo saldo: *$${caja.saldo.toFixed(2)}* pesos. 💸`, { parse_mode: 'Markdown' });
                        delete confirmacionesPendientes[userId];
                    })
                    .catch(err => {
                        console.error('Error al actualizar el saldo:', err);
                        bot.sendMessage(chatId, '❌ Error al actualizar el saldo.');
                    });
            })
            .catch(err => {
                console.error('Error al buscar la caja chica:', err);
                bot.sendMessage(chatId, '❌ Error al restar dinero.');
            });
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

            // Crear una nueva caja chica en la base de datos
            const nuevaCaja = new CajaChica({ chatId, saldo: montoInicial });
            nuevaCaja.save()
                .then(() => {
                    bot.sendMessage(chatId, `✅ Se ha iniciado la caja chica con *$${montoInicial.toFixed(2)}* pesos. 💰`, { parse_mode: 'Markdown' });
                    delete confirmacionesPendientes[userId];
                })
                .catch(err => {
                    console.error('Error al guardar la caja chica:', err);
                    bot.sendMessage(chatId, '❌ Error al iniciar la caja chica.');
                });
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

            // Buscar el saldo actual antes de confirmar
            CajaChica.findOne({ chatId })
                .then(caja => {
                    if (!caja) {
                        bot.sendMessage(chatId, '⚠️ La caja chica no ha sido iniciada.');
                        return;
                    }

                    if (cantidad > caja.saldo) {
                        bot.sendMessage(chatId, `⚠️ No puedes restar una cantidad mayor al saldo actual de la caja chica (*$${caja.saldo.toFixed(2)}* pesos).`);
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
                })
                .catch(err => {
                    console.error('Error al buscar la caja chica:', err);
                    bot.sendMessage(chatId, '❌ Error al procesar la solicitud.');
                });
        }
    }
});
startServer();