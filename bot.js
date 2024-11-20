require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');


// Usar el token del archivo .env
const token = process.env.TELEGRAM_TOKEN;

// Construir la URL pública de la aplicación (fija) sin barra al final
const url = process.env.APP_URL.replace(/\/$/, ''); // Elimina la barra final si existe

if (!url) {
    console.error('Error: APP_URL no está definido en el archivo .env.');
    process.exit(1);
}

const { withRetry } = require('./dbHelper');

const port = process.env.PORT || 3000;

// Crear el bot con polling deshabilitado
const bot = new TelegramBot(token, { polling: false });

// Inicializar Express
const app = express();

// Middleware para parsear el cuerpo de las solicitudes
app.use(bodyParser.json());

// Importar el modelo de CajaChica
const CajaChica = require('./models/CajaChica');

// Ruta para recibir las actualizaciones de Telegram
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
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

// dbHelper.js
async function withRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await operation();
            return result;
        } catch (error) {
            console.error(`Intento ${attempt}/${maxRetries} fallido:`, error);
            lastError = error;
            
            if (attempt < maxRetries) {
                // Esperar antes del siguiente intento (tiempo exponencial)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    
    throw lastError;
}

module.exports = { withRetry };

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
                [{ text: '💰 Ver Saldo', callback_data: 'verSaldo' }],
                [{ text: '✏️ Modificar Saldo', callback_data: 'modificarSaldo' }],
                [{ text: '🗑️ Eliminar Caja', callback_data: 'eliminarCaja' }]
            ]
        }
    };

    bot.sendMessage(chatId, '🛠️ *Menú de Supervisores*:\nElige una opción:', { 
        parse_mode: 'Markdown',
        ...opciones 
    });
});

// Manejar las interacciones del Inline Keyboard
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id);

    if (!esSupervisor(userId)) {
        bot.sendMessage(chatId, '❌ No tienes permiso para realizar esta acción.');
        return;
    }

    switch (data) {
        case 'verSaldo':
            handleSaldo(chatId, userId);
            break;
        case 'iniciarCaja':
            iniciarCaja(chatId, userId);
            break;
        case 'agregarDinero':
            agregarDinero(chatId, userId);
            break;
        case 'restarDinero':
            restarDinero(chatId, userId);
            break;
        case 'modificarSaldo':
            await handleModificarSaldo(chatId, userId);
            break;
        case 'eliminarCaja':
            await handleEliminarCaja(chatId, userId);
            break;
        case 'confirmarEliminar':
            try {
                const resultado = await CajaChica.findOneAndDelete({ chatId });
                if (resultado) {
                    bot.sendMessage(
                        chatId,
                        '✅ Caja eliminada exitosamente.\n' +
                        'Usa /sup para iniciar una nueva caja cuando lo necesites.',
                        { parse_mode: 'Markdown' }
                    );
                } else {
                    bot.sendMessage(chatId, '⚠️ No se encontró la caja para eliminar.');
                }
                delete confirmacionesPendientes[userId];
            } catch (error) {
                console.error('Error al eliminar caja:', error);
                bot.sendMessage(chatId, '❌ Error al eliminar la caja.');
            }
            break;
        case 'cancelar':
            bot.sendMessage(chatId, '🚫 Operación cancelada.');
            delete confirmacionesPendientes[userId];
            break;
        case 'confirmarAgregar':
            confirmarAgregarDinero(chatId, userId);
            break;
        case 'confirmarRestar':
            confirmarRestarDinero(chatId, userId);
            break;
    }
});

// Función para manejar la opción "Ver Saldo" (accesible para todos)
async function handleSaldo(chatId, userId) {
    try {
        const caja = await withRetry(async () => {
            return await CajaChica.findOne({ chatId });
        });

        if (!caja) {
            bot.sendMessage(chatId, '⚠️ Primero el supervisor debe iniciar la caja chica.');
            return;
        }

        bot.sendMessage(chatId, `💰 *Saldo Actual*:\n*${caja.saldo.toFixed(2)}* pesos.`, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error al obtener saldo:', error);
        bot.sendMessage(chatId, '❌ Error al obtener el saldo. Intente nuevamente en unos momentos.');
    }
}

// Función para iniciar la caja chica (supervisores)
async function iniciarCaja(chatId, userId) {
    try {
        const caja = await withRetry(async () => {
            return await CajaChica.findOne({ chatId });
        });

        if (caja) {
            bot.sendMessage(chatId, '⚠️ La caja chica ya ha sido iniciada y no puede reiniciarse.');
            return;
        }

        bot.sendMessage(
            chatId, 
            '🏁 *Iniciar Caja Chica*:\nPor favor, ingresa el monto inicial:', 
            { parse_mode: 'Markdown' }
        );
        confirmacionesPendientes[userId] = { chatId, tipo: 'iniciarCaja' };
    } catch (error) {
        console.error('Error al buscar caja chica:', error);
        bot.sendMessage(chatId, '❌ Error al iniciar la caja chica. Por favor, intenta nuevamente.');
    }
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

// Agregar estas funciones junto a tus otras funciones de manejo

// Función para modificar saldo
async function handleModificarSaldo(chatId, userId) {
    try {
        const caja = await withRetry(async () => {
            return await CajaChica.findOne({ chatId });
        });

        if (!caja) {
            bot.sendMessage(chatId, '⚠️ No hay una caja chica iniciada en este chat.');
            return;
        }

        bot.sendMessage(
            chatId, 
            `✏️ *Modificar Saldo*\n` +
            `Saldo actual: *$${caja.saldo.toFixed(2)}*\n` +
            'Por favor, ingresa el nuevo saldo:', 
            { parse_mode: 'Markdown' }
        );
        confirmacionesPendientes[userId] = { 
            chatId, 
            tipo: 'modificarSaldo',
            saldoAnterior: caja.saldo // Guardamos el saldo anterior para referencia
        };
    } catch (error) {
        console.error('Error al modificar saldo:', error);
        bot.sendMessage(chatId, '❌ Error al procesar la solicitud. Por favor, intenta nuevamente.');
    }
}

// Función para eliminar caja
async function handleEliminarCaja(chatId, userId) {
    try {
        const caja = await withRetry(async () => {
            return await CajaChica.findOne({ chatId });
        });

        if (!caja) {
            bot.sendMessage(chatId, '⚠️ No hay una caja chica para eliminar.');
            return;
        }

        const opciones = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Sí, eliminar', callback_data: 'confirmarEliminar' },
                        { text: '❌ No, cancelar', callback_data: 'cancelar' }
                    ]
                ]
            }
        };

        bot.sendMessage(
            chatId,
            `🚨 *¿Estás seguro de eliminar la caja?*\n` +
            `Saldo actual: *$${caja.saldo.toFixed(2)}*\n` +
            'Esta acción no se puede deshacer.',
            { parse_mode: 'Markdown', ...opciones }
        );
        confirmacionesPendientes[userId] = { 
            chatId, 
            tipo: 'eliminarCaja',
            saldoActual: caja.saldo // Guardamos el saldo para el registro
        };
    } catch (error) {
        console.error('Error al eliminar caja:', error);
        bot.sendMessage(chatId, '❌ Error al procesar la solicitud. Por favor, intenta nuevamente.');
    }
}

// Función auxiliar para validar montos
function validarMonto(monto) {
    // Verificar si es un número válido
    if (isNaN(monto) || monto < 0) {
        return {
            esValido: false,
            mensaje: '⚠️ Por favor, ingresa un monto válido (número positivo).'
        };
    }

    // Verificar que no tenga más de 2 decimales
    if (monto.toString().split('.')[1]?.length > 2) {
        return {
            esValido: false,
            mensaje: '⚠️ El monto no puede tener más de 2 decimales.'
        };
    }

    // Verificar que no sea un número demasiado grande
    if (monto > 999999999) {
        return {
            esValido: false,
            mensaje: '⚠️ El monto es demasiado grande.'
        };
    }

    return {
        esValido: true
    };
}

// Confirmar agregar dinero (supervisores)
async function confirmarAgregarDinero(chatId, userId) {
    const confirmacion = confirmacionesPendientes[userId];
    if (confirmacion && confirmacion.tipo === 'agregarDinero') {
        try {
            const caja = await withRetry(async () => {
                const doc = await CajaChica.findOne({ chatId });
                if (!doc) throw new Error('Caja no encontrada');
                return doc;
            });

            caja.saldo += confirmacion.cantidad;
            await withRetry(async () => {
                await caja.save();
            });

            bot.sendMessage(
                chatId, 
                `✅ Se han agregado *$${confirmacion.cantidad.toFixed(2)}* pesos.\n` +
                `Nuevo saldo: *$${caja.saldo.toFixed(2)}* pesos. 💵`, 
                { parse_mode: 'Markdown' }
            );
            delete confirmacionesPendientes[userId];
        } catch (error) {
            console.error('Error en operación:', error);
            bot.sendMessage(chatId, '❌ Error al procesar la operación. Por favor, intente nuevamente.');
            delete confirmacionesPendientes[userId];
        }
    } else {
        bot.sendMessage(chatId, '⚠️ No hay una acción pendiente de confirmación.');
    }
}

// Confirmar restar dinero (supervisores)
// Confirmar restar dinero (supervisores)
async function confirmarRestarDinero(chatId, userId) {
    const confirmacion = confirmacionesPendientes[userId];
    if (confirmacion && confirmacion.tipo === 'restarDinero') {
        try {
            const caja = await withRetry(async () => {
                const doc = await CajaChica.findOne({ chatId });
                if (!doc) throw new Error('Caja no encontrada');
                return doc;
            });

            const cantidad = confirmacion.cantidad;
            if (cantidad > caja.saldo) {
                bot.sendMessage(chatId, `⚠️ No puedes restar una cantidad mayor al saldo actual de la caja chica (*$${caja.saldo.toFixed(2)}* pesos).`);
                return;
            }

            caja.saldo -= cantidad;
            await withRetry(async () => {
                await caja.save();
            });

            bot.sendMessage(
                chatId, 
                `✅ Se han restado *$${cantidad.toFixed(2)}* pesos.\n` +
                `Nuevo saldo: *$${caja.saldo.toFixed(2)}* pesos. 💸`, 
                { parse_mode: 'Markdown' }
            );
            delete confirmacionesPendientes[userId];
        } catch (error) {
            console.error('Error en operación:', error);
            bot.sendMessage(chatId, '❌ Error al procesar la operación. Por favor, intente nuevamente.');
            delete confirmacionesPendientes[userId];
        }
    } else {
        bot.sendMessage(chatId, '⚠️ No hay una acción pendiente de confirmación.');
    }
}

// Manejar mensajes de entrada (para cantidades y confirmaciones)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Evitar procesar mensajes de los comandos
    if (msg.text && msg.text.startsWith('/')) return;

    // Manejar confirmaciones pendientes
    if (confirmacionesPendientes[userId]) {
        const { tipo } = confirmacionesPendientes[userId];

        switch (tipo) {
            case 'iniciarCaja':
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
                break;

            case 'agregarDinero':
                const cantidadAgregar = parseFloat(msg.text);
                if (isNaN(cantidadAgregar) || cantidadAgregar <= 0) {
                    bot.sendMessage(chatId, '⚠️ Por favor, ingresa una cantidad válida para agregar.');
                    return;
                }

                confirmacionesPendientes[userId].cantidad = cantidadAgregar;
                const opcionesAgregar = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Sí', callback_data: 'confirmarAgregar' },
                                { text: '❌ No', callback_data: 'cancelar' }
                            ]
                        ]
                    }
                };
                bot.sendMessage(chatId, `¿Estás seguro de agregar *$${cantidadAgregar.toFixed(2)}* pesos?`, { 
                    parse_mode: 'Markdown',
                    ...opcionesAgregar 
                });
                break;

            case 'restarDinero':
                const cantidadRestar = parseFloat(msg.text);
                if (isNaN(cantidadRestar) || cantidadRestar <= 0) {
                    bot.sendMessage(chatId, '⚠️ Por favor, ingresa una cantidad válida para restar.');
                    return;
                }

                confirmacionesPendientes[userId].cantidad = cantidadRestar;
                const opcionesRestar = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '✅ Sí', callback_data: 'confirmarRestar' },
                                { text: '❌ No', callback_data: 'cancelar' }
                            ]
                        ]
                    }
                };
                bot.sendMessage(chatId, `¿Estás seguro de restar *$${cantidadRestar.toFixed(2)}* pesos?`, { 
                    parse_mode: 'Markdown',
                    ...opcionesRestar 
                });
                break;

            case 'modificarSaldo':
                const nuevoSaldo = parseFloat(msg.text);
                if (isNaN(nuevoSaldo) || nuevoSaldo < 0) {
                    bot.sendMessage(chatId, '⚠️ Por favor, ingresa un monto válido.');
                    return;
                }

                try {
                    const caja = await CajaChica.findOne({ chatId });
                    if (!caja) {
                        bot.sendMessage(chatId, '⚠️ No se encontró la caja chica.');
                        delete confirmacionesPendientes[userId];
                        return;
                    }

                    const saldoAnterior = caja.saldo;
                    caja.saldo = nuevoSaldo;
                    await caja.save();

                    bot.sendMessage(
                        chatId,
                        `✅ Saldo modificado exitosamente\n` +
                        `Saldo anterior: *$${saldoAnterior.toFixed(2)}*\n` +
                        `Nuevo saldo: *$${nuevoSaldo.toFixed(2)}*`,
                        { parse_mode: 'Markdown' }
                    );

                    delete confirmacionesPendientes[userId];
                } catch (error) {
                    console.error('Error al confirmar modificación:', error);
                    bot.sendMessage(chatId, '❌ Error al modificar el saldo.');
                    delete confirmacionesPendientes[userId];
                }
                break;
        }
    }
});

// Conectar a MongoDB y configurar el webhook después de la conexión
// Configuración de opciones de MongoDB
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    keepAlive: true,
    keepAliveInitialDelay: 300000
};

// Manejadores de eventos de MongoDB
mongoose.connection.on('connected', () => {
    console.log('✅ Conexión establecida con MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Error en la conexión de MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 MongoDB desconectado. Intentando reconectar...');
    setTimeout(() => {
        mongoose.connect(process.env.MONGODB_URI, mongoOptions)
            .catch(err => console.error('❌ Error al reconectar:', err));
    }, 5000);
});

// Conectar a MongoDB y configurar el webhook después de la conexión
mongoose.connect(process.env.MONGODB_URI, mongoOptions)
    .then(async () => {
        console.log('📦 Iniciando servicios...');

        // Iniciar el servidor Express
        app.listen(port, async () => {
            console.log(`🤖 Bot escuchando en puerto ${port}`);

            try {
                // Configurar webhook
                const webhookUrl = `${url}/bot${token}`;
                await bot.setWebHook(webhookUrl);
                console.log(`✅ Webhook configurado: ${webhookUrl}`);
                
                // Verificar cajas existentes
                const count = await CajaChica.countDocuments();
                console.log(`📊 Cajas registradas: ${count}`);
            } catch (error) {
                console.error('❌ Error al configurar servicios:', error);
            }
        });
    })
    .catch(err => {
        console.error('❌ Error fatal al conectar con MongoDB:', err);
        process.exit(1);
    });

// Manejar cierre graceful
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔌 Conexión a MongoDB cerrada correctamente');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error al cerrar la conexión:', err);
        process.exit(1);
    }
});
