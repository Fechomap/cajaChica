// ==========================================
// 1. CONFIGURACIÓN Y DEPENDENCIAS
// ==========================================
// Importaciones necesarias
require('dotenv').config();
process.env.TZ = 'America/Mexico_City';
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cron = require('node-cron');

// Variables de entorno y configuración
const token = process.env.TELEGRAM_TOKEN;
const url = process.env.APP_URL.replace(/\/$/, '');
const port = process.env.PORT || 3000;

// Validaciones de variables de entorno
if (!token) {
    console.error('Error: TELEGRAM_TOKEN no está definido en el archivo .env');
    process.exit(1);
}

if (!url) {
    console.error('Error: APP_URL no está definido en el archivo .env');
    process.exit(1);
}

// ==========================================
// 2. CONFIGURACIÓN DEL WEBHOOK
// ==========================================
async function setupWebhook(bot, webhookUrl) {
    try {
        const webhookInfo = await bot.getWebHookInfo();
        console.log('URL actual del webhook:', webhookInfo.url);
        console.log('URL que intentamos configurar:', webhookUrl);
        
        if (!webhookInfo.url || webhookInfo.url !== webhookUrl) {
            console.log('Configurando webhook...');
            await bot.deleteWebHook();
            
            if (!webhookUrl.startsWith('https://')) {
                throw new Error(`URL del webhook inválida: ${webhookUrl}`);
            }

            await bot.setWebHook(webhookUrl, {
                max_connections: 100,
                drop_pending_updates: true
            });
            
            const newWebhookInfo = await bot.getWebHookInfo();
            console.log('Nueva URL del webhook:', newWebhookInfo.url);
            
            if (newWebhookInfo.url === webhookUrl) {
                console.log(`Webhook configurado correctamente en: ${webhookUrl}`);
            } else {
                throw new Error('La verificación del webhook falló');
            }
        } else {
            console.log('Webhook ya está correctamente configurado en:', webhookInfo.url);
        }
    } catch (error) {
        console.error('Error al configurar el webhook:', error);
        console.log('URL que causó el error:', webhookUrl);
        console.log('Reintentando en 30 segundos...');
        setTimeout(() => setupWebhook(bot, webhookUrl), 30000);
    }
}

// ==========================================
// 3. INICIALIZACIÓN DE SERVICIOS
// ==========================================
// Crear instancias de bot y express
const bot = new TelegramBot(token, { polling: false });
const app = express();
app.use(bodyParser.json());

// Importar modelo
const CajaChica = require('./models/CajaChica');

// ==========================================
// 4. CONFIGURACIÓN DE RUTAS EXPRESS
// ==========================================
// Ruta de salud
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Ruta del webhook
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ==========================================
// 5. CONFIGURACIÓN DEL SERVIDOR
// ==========================================
async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado a MongoDB');

        app.listen(port, () => {
            console.log(`Servidor escuchando en el puerto ${port}`);
            
            const webhookUrl = `${url}/bot${token}`;
            console.log('Intentando configurar webhook en:', webhookUrl);
            setupWebhook(bot, webhookUrl);
            
            setInterval(() => {
                setupWebhook(bot, webhookUrl);
            }, 3600000);

            // Iniciar las tareas programadas
            scheduleAutomatedMessages();
            console.log('Mensajes automáticos programados');
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Manejadores de señales
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

// ==========================================
// 6. CONFIGURACIÓN DE USUARIOS Y ESTADOS
// ==========================================
const supervisoresAutorizados = [7143094298, 6330970125];
let confirmacionesPendientes = {};

function esSupervisor(userId) {
    return supervisoresAutorizados.includes(userId);
}

// ==========================================
// 7. COMANDOS DEL BOT
// ==========================================
// Comando /saldo
bot.onText(/\/saldo/, (msg) => {
    const chatId = msg.chat.id;
    handleSaldo(chatId, msg.from.id);
});

// Comando /sup
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

// ==========================================
// 8. MANEJADORES DE CALLBACKS
// ==========================================
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

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

// ==========================================
// 9. FUNCIONES DE MANEJO DE CAJA CHICA
// ==========================================
// Ver saldo
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

// Iniciar caja
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

// Agregar dinero
function agregarDinero(chatId, userId) {
    bot.sendMessage(chatId, '➕ *Agregar Dinero*:\n¿Cuánto deseas agregar?', { parse_mode: 'Markdown' });
    confirmacionesPendientes[userId] = { chatId, tipo: 'agregarDinero' };
}

// Restar dinero
function restarDinero(chatId, userId) {
    bot.sendMessage(chatId, '➖ *Restar Dinero*:\n¿Cuánto deseas restar?', { parse_mode: 'Markdown' });
    confirmacionesPendientes[userId] = { chatId, tipo: 'restarDinero' };
}

// Confirmar agregar dinero
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

// Confirmar restar dinero
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

// ==========================================
// 10. MANEJADOR DE MENSAJES PRINCIPAL
// ==========================================
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Ignorar comandos
    if (msg.text && msg.text.startsWith('/')) return;

    // Procesar confirmaciones pendientes
    if (confirmacionesPendientes[userId]) {
        const { tipo } = confirmacionesPendientes[userId];

        // ==========================================
        // 11. MANEJO DE INICIALIZACIÓN DE CAJA
        // ==========================================
        if (tipo === 'iniciarCaja') {
            const montoInicial = parseFloat(msg.text);
            if (isNaN(montoInicial) || montoInicial <= 0) {
                bot.sendMessage(chatId, '⚠️ Por favor, ingresa una cantidad válida para iniciar la caja chica.');
                return;
            }

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
        } 
        
        // ==========================================
        // 12. MANEJO DE AGREGAR DINERO
        // ==========================================
        else if (tipo === 'agregarDinero') {
            const cantidad = parseFloat(msg.text);
            if (isNaN(cantidad) || cantidad <= 0) {
                bot.sendMessage(chatId, '⚠️ Por favor, ingresa una cantidad válida para agregar.');
                return;
            }

            confirmacionesPendientes[userId].cantidad = cantidad;

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
        } 
        
        // ==========================================
        // 13. MANEJO DE RESTAR DINERO
        // ==========================================
        else if (tipo === 'restarDinero') {
            const cantidad = parseFloat(msg.text);
            if (isNaN(cantidad) || cantidad <= 0) {
                bot.sendMessage(chatId, '⚠️ Por favor, ingresa una cantidad válida para restar.');
                return;
            }

            // Verificar saldo antes de confirmar
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

                    confirmacionesPendientes[userId].cantidad = cantidad;

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

// ==========================================
// 14. CRONE ALERTAS
// ==========================================
function scheduleAutomatedMessages() {
    // Probemos con un intervalo de 2 minutos para verificar que funciona
    const currentTime = new Date();
    const targetMinute = currentTime.getMinutes() + 2; // 2 minutos después de la hora actual
    
    const testSchedule = `${targetMinute} ${currentTime.getHours()} * * *`;
    console.log(`Programando mensaje para: ${testSchedule}`);
    
    const reminder = "Si cuentas con casetas, recuerda subir la foto para proceder con el registro!!! Gracias como siempre!!!";

    cron.schedule(testSchedule, async () => {
        console.log('=== INICIANDO ENVÍO DE MENSAJES AUTOMÁTICOS ===');
        console.log(`Hora de ejecución: ${new Date().toLocaleString()}`);
        
        try {
            const cajas = await CajaChica.find({});
            console.log(`Encontradas ${cajas.length} cajas en la base de datos`);
            
            for (const caja of cajas) {
                console.log(`Intentando enviar mensaje a chat ID: ${caja.chatId}`);
                try {
                    await handleSaldo(caja.chatId, null);
                    await bot.sendMessage(caja.chatId, reminder);
                    console.log(`✅ Mensaje enviado exitosamente a chat ID: ${caja.chatId}`);
                } catch (error) {
                    console.error(`❌ Error enviando mensaje a chat ID ${caja.chatId}:`, error);
                }
            }
        } catch (error) {
            console.error('Error general en el envío de mensajes:', error);
        }
    }, {
        timezone: "America/Mexico_City",
        scheduled: true
    });

    console.log('Sistema de mensajes automáticos configurado');
}

// Test inmediato (se ejecutará 1 minuto después de iniciar el servidor)
setTimeout(async () => {
    console.log('Ejecutando test de mensaje automático...');
    const cajas = await CajaChica.find({});
    for (const caja of cajas) {
        await handleSaldo(caja.chatId, null);
        await bot.sendMessage(caja.chatId, "Test de mensaje automático - Si cuentas con casetas, recuerda subir la foto para proceder con el registro!!! Gracias como siempre!!!");
    }
}, 60000);

// ==========================================
// 15. INICIALIZACIÓN DEL SERVIDOR
// ==========================================
startServer();