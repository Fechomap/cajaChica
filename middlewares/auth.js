require('dotenv').config();

// Cargar supervisores desde variables de entorno o usar valores por defecto
const supervisoresAutorizados = process.env.SUPERVISORES_IDS 
    ? process.env.SUPERVISORES_IDS.split(',').map(Number)
    : [7143094298, 5660087041]; // IDs por defecto

const esSupervisor = (userId) => {
    return supervisoresAutorizados.includes(userId);
};

const verificarSupervisor = (userId, chatId, bot) => {
    if (!esSupervisor(userId)) {
        bot.sendMessage(chatId, '❌ ¡Ups! No tienes permiso para acceder al menú de supervisores.');
        return false;
    }
    return true;
};

// Estado de las confirmaciones pendientes (podría moverse a una base de datos en el futuro)
let confirmacionesPendientes = {};

// Limpiar confirmaciones antiguas cada 5 minutos
setInterval(() => {
    const tiempoLimite = 5 * 60 * 1000; // 5 minutos
    const ahora = Date.now();
    
    Object.entries(confirmacionesPendientes).forEach(([userId, datos]) => {
        if (ahora - datos.timestamp > tiempoLimite) {
            delete confirmacionesPendientes[userId];
        }
    });
}, 60000); // Revisar cada minuto

module.exports = {
    esSupervisor,
    verificarSupervisor,
    confirmacionesPendientes,
    supervisoresAutorizados
};