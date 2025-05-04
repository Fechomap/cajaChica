// ==========================================
// 1. CONFIGURACIÓN Y DEPENDENCIAS
// ==========================================
// Importaciones necesarias
require('dotenv').config();
process.env.TZ = 'America/Mexico_City';
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const cron = require('node-cron');

let bot;
let app;

// Detectar entorno
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID;
const port = process.env.PORT || 3000;


// Variables de entorno y configuración
const token = process.env.TELEGRAM_TOKEN;

// Función auxiliar para obtener la URL del webhook de forma centralizada
function getWebhookUrl(token) {
  let rawUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
            || process.env.RAILWAY_STATIC_URL 
            || process.env.APP_URL;
  if (!rawUrl) {
    console.error('Error: No se pudo determinar la URL del webhook. Revisa variables de entorno.');
    process.exit(1);
  }
  rawUrl = rawUrl.replace(/\/$/, '');
  // Si es RAILWAY_PUBLIC_DOMAIN o RAILWAY_STATIC_URL, asegurar https://
  if (process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL) {
    if (!/^https?:\/\//.test(rawUrl)) {
      rawUrl = `https://${rawUrl}`;
    }
  }
  return `${rawUrl}/bot${token}`;
}

// Validaciones de variables de entorno
if (!token) {
    console.error('Error: TELEGRAM_TOKEN no está definido en el archivo .env');
    process.exit(1);
}
if (isProduction && !process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI no está definido en producción');
    process.exit(1);
}

// ==========================================
// 2. CONFIGURACIÓN DEL WEBHOOK
// ==========================================
async function setupWebhook(botInstance, webhookUrl) {
    try {
        const webhookInfo = await botInstance.getWebHookInfo();
        console.log('🔍 Webhook info antes de configurar:', JSON.stringify(webhookInfo, null, 2));
        
        if (!webhookInfo.url || webhookInfo.url !== webhookUrl) {
            console.log('⚠️ Webhook diferente o vacío. Configurando...');
            
            // Elimina el webhook existente con debug
            console.log('🔄 Eliminando webhook actual...');
            const deleteResult = await botInstance.deleteWebHook();
            console.log('🔄 Resultado de eliminar webhook:', deleteResult);
            
            // Espera un momento para asegurarse de que Telegram procese la eliminación
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (!webhookUrl.startsWith('https://')) {
                throw new Error(`URL del webhook inválida: ${webhookUrl}`);
            }

            console.log('✨ Configurando nuevo webhook con URL:', webhookUrl);
            
            // Intenta configurar con más opciones y debug
            const setWebhookResult = await botInstance.setWebHook(webhookUrl, {
                max_connections: 100,
                drop_pending_updates: true
            });
            
            console.log('✅ Resultado de setWebHook:', setWebhookResult);
            
            // Verifica inmediatamente después de configurar
            const newWebhookInfo = await botInstance.getWebHookInfo();
            console.log('🔍 Webhook info DESPUÉS de configurar:', JSON.stringify(newWebhookInfo, null, 2));
            
            if (newWebhookInfo.url === webhookUrl) {
                console.log(`✅ Webhook configurado correctamente en: ${webhookUrl}`);
            } else {
                throw new Error(`La verificación del webhook falló. URL esperada: ${webhookUrl}, URL actual: ${newWebhookInfo.url}`);
            }
        } else {
            console.log('✅ Webhook ya está correctamente configurado en:', webhookInfo.url);
        }
    } catch (error) {
        console.error('❌ Error al configurar el webhook:', error);
        console.log('🔍 Error detallado:', error.message);
        console.log('🔍 Stack trace:', error.stack);
        console.log('URL que causó el error:', webhookUrl);
        console.log('Reintentando en 30 segundos...');
        setTimeout(() => setupWebhook(botInstance, webhookUrl), 30000);
    }
}

// ==========================================
// 3. INICIALIZACIÓN DE SERVICIOS
// ==========================================
// Crear instancias de bot y express
if (isProduction) {
    console.log('🌐 Iniciando en modo PRODUCCIÓN (Railway) - Usando Webhook');
    bot = new TelegramBot(token, { polling: false });
    app = express();
    app.use(express.json());
} else {
    console.log('💻 Iniciando en modo DESARROLLO (Local) - Usando Polling');
    bot = new TelegramBot(token, { polling: true });
}

// Importar modelo
const CajaChica = require('./models/CajaChica');

// ==========================================
// 4. CONFIGURACIÓN DE RUTAS EXPRESS
// ==========================================
if (isProduction) {
  // Ruta de salud
  app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Ruta del webhook
  app.post(`/bot${token}`, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
  });
}

// ==========================================
// 5. CONFIGURACIÓN DEL SERVIDOR
// ==========================================
async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado a MongoDB');

        if (isProduction) {
            const webhookUrl = getWebhookUrl(token);
            app.listen(port, () => {
                console.log(`Servidor escuchando en el puerto ${port}`);
                console.log('Intentando configurar webhook en:', webhookUrl);
                setupWebhook(bot, webhookUrl);
                setInterval(() => {
                    setupWebhook(bot, webhookUrl);
                }, 3600000);
                // Iniciar las tareas programadas
                scheduleAutomatedMessages();
                console.log('Mensajes automáticos programados');
            });
        } else {
            // Local (polling)
            scheduleAutomatedMessages();
            console.log('Mensajes automáticos programados');
        }
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Manejadores de señales
process.on('SIGTERM', async () => {
    console.log('Recibida señal SIGTERM, cerrando servidor...');
    if (isProduction) {
        await bot.deleteWebHook();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Recibida señal SIGINT, cerrando servidor...');
    if (isProduction) {
        await bot.deleteWebHook();
    }
    process.exit(0);
});

// ==========================================
// 6. CONFIGURACIÓN DE USUARIOS Y ESTADOS
// ==========================================
const supervisoresAutorizados = [7143094298, 6330970125];
let confirmacionesPendientes = {};
let esperandoNumeroWhatsApp = new Set();

function esSupervisor(userId) {
    return supervisoresAutorizados.includes(userId);
}

function generarMensajeCuenta() {
    return `
CUENTA BBVA:

**Nombre:** Alfredo Alejandro Perez Aguilar

**Cuenta:** 1582680561

**CLABE:** 012180015826805612

**T débito:** 4152314307139520
`;
}

function generarMensajeWhatsApp(numero) {
    // Mensaje con formato monoespaciado y doble salto de línea
    const mensajeWhatsApp = encodeURIComponent(`\`\`\`
CUENTA BBVA:

Nombre: Alfredo Alejandro Perez Aguilar

Cuenta: 1582680561

CLABE: 012180015826805612

T débito: 4152314307139520
\`\`\``);

    // Generar el enlace de WhatsApp
    const whatsappUrl = `https://wa.me/52${numero}?text=${mensajeWhatsApp}`;

    // Mensaje que se mostrará en Telegram
    return `✅ Número capturado: **${numero}**\n\n[Enviar datos a WhatsApp](${whatsappUrl})`;
}

// ==========================================
// 7. COMANDOS DEL BOT
// ==========================================
// Comando /saldo
bot.onText(/\/saldo/, (msg) => {
    const chatId = msg.chat.id;
    handleSaldo(chatId, msg.from.id);
});

// Comando /cuenta
bot.onText(/\/cuenta/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, generarMensajeCuenta(), { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "Enviar a WhatsApp 📦", callback_data: 'enviar_whatsapp' }]
            ]
        }
    });
});

// Comando /sup
bot.onText(/\/sup/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!esSupervisor(userId)) {
        bot.sendMessage(chatId, '❌ ¡Ups! No tienes permiso para acceder al menú.');
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
    } else if (data === 'enviar_whatsapp') {
        esperandoNumeroWhatsApp.add(chatId);
        bot.sendMessage(chatId, 'Por favor, ingresa el número de WhatsApp a 10 dígitos📱\n\nSi ingresas un número inválido, deberás usar /cuenta para intentar nuevamente.');
    } else if (data === 'cancelar') {
        bot.sendMessage(chatId, '🚫 Operación cancelada.');
        delete confirmacionesPendientes[userId];
        esperandoNumeroWhatsApp.delete(chatId);
    }
});

// ==========================================
// 9. FUNCIONES DE MANEJO DE CAJA CHICA.
// ==========================================
// Ver saldo
function handleSaldo(chatId, userId) {
    CajaChica.findOne({ chatId })
        .then(caja => {
            if (!caja) {
                bot.sendMessage(chatId, '⚠️ Primero el supervisor debe iniciar la caja chica.')
                    .catch(error => {
                        if (error.response && error.response.parameters && error.response.parameters.migrate_to_chat_id) {
                            // Si el chat se actualizó a supergrupo, actualizar el ID en la base de datos
                            const newChatId = error.response.parameters.migrate_to_chat_id;
                            return CajaChica.findOneAndUpdate(
                                { chatId: chatId },
                                { chatId: newChatId },
                                { new: true }
                            ).then(() => {
                                return bot.sendMessage(newChatId, '⚠️ Primero el supervisor debe iniciar la caja chica.');
                            });
                        }
                        console.error('Error al enviar mensaje:', error);
                    });
                return;
            }
            bot.sendMessage(chatId, `💰 *Saldo Actual*:\n*${caja.saldo.toFixed(2)}* pesos.`, { parse_mode: 'Markdown' })
                .catch(error => {
                    if (error.response && error.response.parameters && error.response.parameters.migrate_to_chat_id) {
                        const newChatId = error.response.parameters.migrate_to_chat_id;
                        return CajaChica.findOneAndUpdate(
                            { chatId: chatId },
                            { chatId: newChatId },
                            { new: true }
                        ).then(updatedCaja => {
                            return bot.sendMessage(newChatId, `💰 *Saldo Actual*:\n*${updatedCaja.saldo.toFixed(2)}* pesos.`, { parse_mode: 'Markdown' });
                        });
                    }
                    console.error('Error al enviar mensaje:', error);
                });
        })
        .catch(err => {
            console.error('Error al obtener el saldo:', err);
            bot.sendMessage(chatId, '❌ Error al obtener el saldo.')
                .catch(console.error);
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

    // Procesar número de WhatsApp si está esperando uno
    if (esperandoNumeroWhatsApp.has(chatId)) {
        const numero = msg.text.trim();
        
        // Validar que sean exactamente 10 dígitos
        if (!/^\d{10}$/.test(numero)) {
            bot.sendMessage(chatId, '❌ El número ingresado no es válido.\nUsa /cuenta para intentar nuevamente.');
            // Limpiar el estado inmediatamente
            esperandoNumeroWhatsApp.delete(chatId);
            return;
        }

        // Enviar confirmación y enlace usando la función auxiliar
        bot.sendMessage(chatId, generarMensajeWhatsApp(numero), {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });

        // Limpiar el estado
        esperandoNumeroWhatsApp.delete(chatId);
        return;
    }

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
    const schedules = ['0 1 * * *', '0 7 * * *', '0 13 * * *', '0 19 * * *'];
    
    console.log('Configurando mensajes automáticos para los horarios:', schedules);

    schedules.forEach(schedule => {
        cron.schedule(schedule, async () => {
            console.log(`⏰ Ejecutando mensaje programado - ${new Date().toLocaleString()}`);
            try {
                const cajas = await CajaChica.find({});
                console.log(`📊 Encontradas ${cajas.length} cajas para notificar`);
                
                await enviarMensajesConDelay(cajas);
            } catch (error) {
                console.error('❌ Error general en el envío de mensajes:', error.message);
            }
        }, {
            timezone: "America/Mexico_City",
            scheduled: true
        });
    });

    console.log('✅ Sistema de mensajes automáticos configurado correctamente');
}

// Función para enviar mensajes con delay
async function enviarMensajesConDelay(cajas) {
    console.log(`📊 Iniciando envío de mensajes a ${cajas.length} grupos...`);
    
    for (const [index, caja] of cajas.entries()) {
        try {
            console.log(`Enviando mensaje ${index + 1}/${cajas.length} al chat ID: ${caja.chatId}`);
            
            // Enviar saldo
            await handleSaldo(caja.chatId, null);
            
            // Pequeña pausa entre mensajes al mismo grupo
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mensaje con formato monoespaciado
            const mensaje = 
                '`- Si cuenta con casetas 🚧 o algún gasto por reportar...\n\n' +
                '- Envieme la foto 📸, o la información correspondiente al chat PERSONAL para proceder con el registro de las mismas.\n\n' +
                '- Gracias como siempre! ¡Saludos! ✨👋`';
            
            await bot.sendMessage(caja.chatId, mensaje, { parse_mode: 'Markdown' });
            
            console.log(`✅ Mensajes enviados exitosamente al chat ID: ${caja.chatId}`);
            
            if (index < cajas.length - 1) {
                console.log(`⏳ Esperando 10 segundos para el siguiente grupo...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            
        } catch (error) {
            console.error(`❌ Error enviando mensajes al chat ID ${caja.chatId}:`, error.message);
            
            if (error.response?.parameters?.migrate_to_chat_id) {
                const newChatId = error.response.parameters.migrate_to_chat_id;
                console.log(`🔄 Actualizando chat ID ${caja.chatId} a ${newChatId}`);
                try {
                    await CajaChica.findOneAndUpdate(
                        { chatId: caja.chatId },
                        { chatId: newChatId }
                    );
                    await handleSaldo(newChatId, null);
                    
                    // Usar el mismo mensaje monoespaciado
                    const mensaje = 
                        '`- Si cuenta con casetas 🚧 o algún gasto por reportar...\n\n' +
                        '- Envieme la foto 📸, o la información correspondiente al chat PERSONAL para proceder con el registro de las mismas.\n\n' +
                        '- Gracias como siempre! ¡Saludos! ✨👋`';
                    
                    await bot.sendMessage(newChatId, mensaje, { parse_mode: 'Markdown' });
                } catch (updateError) {
                    console.error(`Error actualizando/reenviando al nuevo chat ID:`, updateError);
                }
            }
        }
    }
    
    console.log('✅ Proceso de envío de mensajes completado');
}

// ==========================================
// 15. INICIALIZACIÓN DEL SERVIDOR
// ==========================================
// ==========================================
// FUNCIÓN ALTERNATIVA PARA CONFIGURAR WEBHOOK (Método directo con axios)
// ==========================================
async function setupWebhookAlternative(token, webhookUrl) {
    try {
        const axios = require('axios');
        
        // Primero, veamos qué responde la API directamente
        const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
            url: webhookUrl,
            max_connections: 100,
            drop_pending_updates: true
        });
        
        console.log('🔧 Respuesta directa de setWebhook:', JSON.stringify(response.data, null, 2));
        
        // Verificar el estado del webhook
        const checkResponse = await axios.post(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        console.log('🔧 Respuesta directa de getWebhookInfo:', JSON.stringify(checkResponse.data, null, 2));
        
    } catch (error) {
        console.error('❌ Error con método alternativo:', error.message);
    }
}

startServer();