require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');

// Usar el token del archivo .env
const token = process.env.TELEGRAM_TOKEN;

// URL pública de tu aplicación en Heroku
const url = process.env.APP_URL || 'https://caja-e71a3bcba657.herokuapp.com/'; // Reemplaza con la URL de tu aplicación
const port = process.env.PORT || 3000;

// Crear el bot con webhooks
const bot = new TelegramBot(token);
bot.setWebHook(`${url}/bot${token}`);

// Inicializar Express
const app = express();

// Middleware para parsear el cuerpo de las solicitudes
app.use(bodyParser.json());

// Ruta para recibir las actualizaciones de Telegram
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});


// Variables para almacenar los saldos de caja chica y gastos pendientes por grupo
let cajaChicaPorGrupo = {};
let gastosPendientesPorGrupo = {};

// Usuarios autorizados para manipular la caja chica (supervisores)
const supervisoresAutorizados = [7143094298, 5660087041]; // Reemplaza con los IDs de los supervisores autorizados

// Usuarios autorizados para registrar gastos (operadores)
const operadoresAutorizados = [6330970125, 8048487029, 7509818905, 7754458578]; // Reemplaza con los IDs de los operadores autorizados

// Función para verificar si el usuario es supervisor
function esSupervisor(userId) {
    return supervisoresAutorizados.includes(userId);
}

// Función para verificar si el usuario es operador
function esOperador(userId) {
    return operadoresAutorizados.includes(userId);
}

// Función para verificar si el usuario está autorizado (supervisor u operador)
function estaAutorizado(userId) {
    return esSupervisor(userId) || esOperador(userId);
}

// Objetos para manejar el estado de las conversaciones
let esperandoGasto = {}; // userId: { chatId, paso, datos }
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
                [{ text: '✅ Aprobar Gasto', callback_data: 'aprobarGasto' }],
                [{ text: '📋 Ver Gastos Pendientes', callback_data: 'verGastos' }],
                [{ text: '💰 Ver Saldo', callback_data: 'verSaldo' }]
            ]
        }
    };

    bot.sendMessage(chatId, '🛠️ *Menú de Supervisores*:\nElige una opción:', { parse_mode: 'Markdown', ...opciones });
});

// Comando /g (menú para operadores)
bot.onText(/\/g/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!esOperador(userId)) {
        bot.sendMessage(chatId, '❌ ¡Ups! No tienes permiso para acceder al menú de operadores.');
        return;
    }

    const opciones = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '💸 Registrar Gasto', callback_data: 'registrarGasto' }],
                [{ text: '📋 Ver Gastos Pendientes', callback_data: 'verGastos' }],
                [{ text: '💰 Ver Saldo', callback_data: 'verSaldo' }]
            ]
        }
    };

    bot.sendMessage(chatId, '👷 *Menú de Operadores*:\nElige una opción:', { parse_mode: 'Markdown', ...opciones });
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
    } else if (data === 'registrarGasto' && esOperador(userId)) {
        iniciarRegistroGasto(chatId, userId);
    } else if (data === 'iniciarCaja' && esSupervisor(userId)) {
        iniciarCaja(chatId, userId);
    } else if (data === 'agregarDinero' && esSupervisor(userId)) {
        agregarDinero(chatId, userId);
    } else if (data === 'restarDinero' && esSupervisor(userId)) {
        restarDinero(chatId, userId);
    } else if (data === 'verGastos' && estaAutorizado(userId)) {
        verGastosPendientes(chatId, userId);
    } else if (data === 'aprobarGasto' && esSupervisor(userId)) {
        aprobarGasto(chatId, userId);
    } else if (data === 'confirmarAgregar' && esSupervisor(userId)) {
        confirmarAgregarDinero(chatId, userId);
    } else if (data === 'confirmarRestar' && esSupervisor(userId)) {
        confirmarRestarDinero(chatId, userId);
    } else if (data === 'confirmarRegistrarGasto' && esOperador(userId)) {
        confirmarRegistrarGasto(chatId, userId);
    } else if (data === 'cancelar') {
        bot.sendMessage(chatId, '🚫 Operación cancelada.');
        delete confirmacionesPendientes[userId];
        delete esperandoGasto[userId];
    } else if (data.startsWith('aprobar_') && esSupervisor(userId)) {
        const gastoId = parseInt(data.split('_')[1], 10);
        procesarAprobacionGasto(chatId, userId, gastoId);
    } else if (data.startsWith('confirmaAprobacion_') && esSupervisor(userId)) {
        const gastoId = parseInt(data.split('_')[1], 10);
        confirmarAprobacionGasto(chatId, gastoId);
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

// Función para iniciar el registro de un gasto (operadores)
function iniciarRegistroGasto(chatId, userId) {
    // Verificar si ya existe una caja chica en el grupo
    if (!cajaChicaPorGrupo[chatId]) {
        bot.sendMessage(chatId, '⚠️ Primero el supervisor debe iniciar la caja chica.');
        return;
    }

    // Pregunta de confirmación
    const opciones = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Sí', callback_data: 'confirmarRegistrarGasto' },
                    { text: '❌ No', callback_data: 'cancelar' }
                ]
            ]
        },
        parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, '💸 ¿Deseas registrar un nuevo gasto?', opciones);
    confirmacionesPendientes[userId] = { chatId, tipo: 'registrarGasto' };
}

// Función para confirmar el inicio del registro de gasto (operadores)
function confirmarRegistrarGasto(chatId, userId) {
    const confirmacion = confirmacionesPendientes[userId];
    if (confirmacion && confirmacion.tipo === 'registrarGasto') {
        bot.sendMessage(chatId, '💸 *Registro de Gasto*:\n¿Cuánto gastaste? (Ingresa una cantidad, por ejemplo: 300.50)', { parse_mode: 'Markdown' });
        esperandoGasto[userId] = { chatId, paso: 'esperandoCantidad' };
        delete confirmacionesPendientes[userId];
    } else {
        bot.sendMessage(chatId, '⚠️ No hay una acción pendiente de confirmación.');
    }
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

// Función para ver gastos pendientes (supervisores y operadores)
function verGastosPendientes(chatId, userId) {
    // Verificar si ya existe una caja chica en el grupo
    if (!cajaChicaPorGrupo[chatId]) {
        bot.sendMessage(chatId, '⚠️ Primero el supervisor debe iniciar la caja chica.');
        return;
    }

    const gastosPendientes = gastosPendientesPorGrupo[chatId] || [];
    if (gastosPendientes.length === 0) {
        bot.sendMessage(chatId, '✅ No hay gastos pendientes por aprobar. 🟢');
        return;
    }

    let mensaje = '📝 *Gastos Pendientes por Aprobar*:\n\n';
    gastosPendientes.forEach(gasto => {
        mensaje += `• *ID:* ${gasto.id}\n  *Usuario:* ${gasto.usuario}\n  *Cantidad:* $${gasto.cantidad.toFixed(2)} pesos\n  *Fecha:* ${gasto.timestamp.toLocaleString()}\n`;
        if (gasto.motivo) {
            mensaje += `  *Motivo:* ${gasto.motivo}\n`;
        }
        mensaje += `\n`;
    });

    bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
}

// Función para aprobar gastos (supervisores)
function aprobarGasto(chatId, userId) {
    // Verificar si hay gastos pendientes
    const gastosPendientes = gastosPendientesPorGrupo[chatId] || [];
    if (gastosPendientes.length === 0) {
        bot.sendMessage(chatId, '✅ No hay gastos pendientes por aprobar. 🟢');
        return;
    }

    // Mostrar lista de gastos pendientes con botones
    const opciones = {
        reply_markup: {
            inline_keyboard: gastosPendientes.map(gasto => ([
                { text: `Aprobar Gasto ID ${gasto.id} - $${gasto.cantidad.toFixed(2)}`, callback_data: `aprobar_${gasto.id}` }
            ]))
        }
    };

    bot.sendMessage(chatId, 'Seleccione el gasto que desea aprobar:', opciones);
}

// Manejar aprobaciones de gastos individuales
function procesarAprobacionGasto(chatId, userId, gastoId) {
    const gastosPendientes = gastosPendientesPorGrupo[chatId] || [];
    const gasto = gastosPendientes.find(g => g.id === gastoId);

    if (!gasto) {
        bot.sendMessage(chatId, `⚠️ No se encontró un gasto con ID *${gastoId}*.`, { parse_mode: 'Markdown' });
        return;
    }

    // Verificar que el saldo sea suficiente
    if (gasto.cantidad > cajaChicaPorGrupo[chatId]) {
        bot.sendMessage(chatId, `⚠️ No hay suficiente saldo para aprobar este gasto. Saldo actual: *$${cajaChicaPorGrupo[chatId].toFixed(2)}* pesos.`, { parse_mode: 'Markdown' });
        return;
    }

    // Confirmación con botones inline
    const opciones = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Sí', callback_data: `confirmaAprobacion_${gastoId}` },
                    { text: '❌ No', callback_data: 'cancelar' }
                ]
            ]
        },
        parse_mode: 'Markdown'
    };

    bot.sendMessage(chatId, `¿Estás seguro de que deseas aprobar y restar *$${gasto.cantidad.toFixed(2)}* pesos del gasto con ID *${gastoId}*?`, opciones);
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

// Confirmar aprobación de gasto (supervisores)
function confirmarAprobacionGasto(chatId, gastoId) {
    const gastosPendientes = gastosPendientesPorGrupo[chatId];
    const gastoIndex = gastosPendientes.findIndex(g => g.id === gastoId);

    if (gastoIndex === -1) {
        bot.sendMessage(chatId, `⚠️ No se encontró un gasto con ID *${gastoId}*.`, { parse_mode: 'Markdown' });
        return;
    }

    const gasto = gastosPendientes[gastoIndex];

    // Restar del saldo
    cajaChicaPorGrupo[chatId] -= gasto.cantidad;
    cajaChicaPorGrupo[chatId] = parseFloat(cajaChicaPorGrupo[chatId].toFixed(2));

    // Eliminar el gasto de pendientes
    gastosPendientes.splice(gastoIndex, 1);

    bot.sendMessage(chatId, `✅ Se ha aprobado y restado *$${gasto.cantidad.toFixed(2)}* pesos del gasto con ID *${gastoId}*.\n💰 Nuevo saldo: *$${cajaChicaPorGrupo[chatId].toFixed(2)}* pesos.`, { parse_mode: 'Markdown' });
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
            gastosPendientesPorGrupo[chatId] = [];
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

    // Manejar registro de gasto de operadores
    if (esperandoGasto[userId]) {
        const { chatId: chatIdOriginal, paso } = esperandoGasto[userId];

        if (paso === 'esperandoCantidad') {
            const cantidad = parseFloat(msg.text);
            if (isNaN(cantidad) || cantidad <= 0) {
                bot.sendMessage(chatIdOriginal, '⚠️ Por favor, ingresa una cantidad válida para el gasto.');
                return;
            }

            esperandoGasto[userId].cantidad = parseFloat(cantidad.toFixed(2));
            esperandoGasto[userId].paso = 'esperandoFoto';
            bot.sendMessage(chatIdOriginal, '🖼️ *Adjunta una foto del comprobante* 📸.\nSi no tienes un comprobante, puedes subir cualquier foto y especificar el motivo.', { parse_mode: 'Markdown' });
        } else if (paso === 'esperandoFoto') {
            const cantidad = esperandoGasto[userId].cantidad;

            if (msg.photo) {
                const fotoArray = msg.photo;
                const foto = fotoArray[fotoArray.length - 1]; // Obtener la mejor calidad
                const fileId = foto.file_id;

                // Registrar el gasto
                const gastoId = (gastosPendientesPorGrupo[chatId] || []).length + 1;
                if (!gastosPendientesPorGrupo[chatId]) gastosPendientesPorGrupo[chatId] = [];

                gastosPendientesPorGrupo[chatId].push({
                    id: gastoId,
                    usuario: msg.from.username || msg.from.first_name || 'Anónimo',
                    cantidad: cantidad,
                    timestamp: new Date(),
                    foto: fileId
                });

                bot.sendMessage(chatId, `📝 *Gasto Registrado*:\nID: *${gastoId}*\nCantidad: *$${cantidad.toFixed(2)}* pesos.\n🔍 Esperando aprobación del supervisor.`, { parse_mode: 'Markdown' });

                // Limpiar el estado
                delete esperandoGasto[userId];
            } else if (msg.text) {
                // Si no se sube una foto, solicitar una foto cualquiera y especificar el motivo
                const motivo = msg.text;
                esperandoGasto[userId].motivo = motivo;
                esperandoGasto[userId].paso = 'esperandoFotoAlternativa';
                bot.sendMessage(chatId, '🖼️ *Por favor, sube una foto de cualquier imagen* 📸 y especifica el motivo de la ausencia del comprobante.', { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, '⚠️ Por favor, sube una foto del comprobante o escribe el motivo de la ausencia.');
            }
        } else if (paso === 'esperandoFotoAlternativa') {
            const cantidad = esperandoGasto[userId].cantidad;
            const motivo = esperandoGasto[userId].motivo;

            if (msg.photo) {
                const fotoArray = msg.photo;
                const foto = fotoArray[fotoArray.length - 1]; // Obtener la mejor calidad
                const fileId = foto.file_id;

                // Registrar el gasto
                const gastoId = (gastosPendientesPorGrupo[chatId] || []).length + 1;
                if (!gastosPendientesPorGrupo[chatId]) gastosPendientesPorGrupo[chatId] = [];

                gastosPendientesPorGrupo[chatId].push({
                    id: gastoId,
                    usuario: msg.from.username || msg.from.first_name || 'Anónimo',
                    cantidad: cantidad,
                    timestamp: new Date(),
                    foto: fileId,
                    motivo: motivo
                });

                bot.sendMessage(chatId, `📝 *Gasto Registrado*:\nID: *${gastoId}*\nCantidad: *$${cantidad.toFixed(2)}* pesos.\n*Motivo:* ${motivo}\n🔍 Esperando aprobación del supervisor.`, { parse_mode: 'Markdown' });

                // Limpiar el estado
                delete esperandoGasto[userId];
            } else {
                bot.sendMessage(chatId, '⚠️ Por favor, sube una foto para completar el registro del gasto.');
            }
        }
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Bot de Telegram escuchando en el puerto ${port}`);
});
