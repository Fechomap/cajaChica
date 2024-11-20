const CajaChica = require('../models/CajaChica');
const { withRetry } = require('../utils/dbHelper');

class CajaService {
    // Obtener saldo
    static async obtenerSaldo(chatId) {
        try {
            const caja = await withRetry(async () => {
                return await CajaChica.findOne({ chatId });
            });

            if (!caja) {
                throw new Error('Caja no encontrada');
            }

            return {
                success: true,
                saldo: caja.saldo,
                mensaje: `💰 *Saldo Actual*:\n*${caja.saldo.toFixed(2)}* pesos.`
            };
        } catch (error) {
            console.error('Error al obtener saldo:', error);
            return {
                success: false,
                mensaje: '❌ Error al obtener el saldo. Intente nuevamente en unos momentos.'
            };
        }
    }

    // Iniciar caja
    static async iniciarCaja(chatId, montoInicial) {
        try {
            const cajaExistente = await CajaChica.findOne({ chatId });
            
            if (cajaExistente) {
                return {
                    success: false,
                    mensaje: '⚠️ La caja chica ya ha sido iniciada y no puede reiniciarse.'
                };
            }

            const nuevaCaja = new CajaChica({ 
                chatId, 
                saldo: montoInicial,
                historial: [{
                    tipo: 'INICIO',
                    monto: montoInicial,
                    saldoAnterior: 0,
                    saldoNuevo: montoInicial,
                    fecha: new Date()
                }]
            });

            await nuevaCaja.save();
            
            return {
                success: true,
                mensaje: `✅ Se ha iniciado la caja chica con *$${montoInicial.toFixed(2)}* pesos. 💰`
            };
        } catch (error) {
            console.error('Error al iniciar caja:', error);
            return {
                success: false,
                mensaje: '❌ Error al iniciar la caja chica.'
            };
        }
    }

    // Agregar dinero
    static async agregarDinero(chatId, cantidad, userId) {
        try {
            const caja = await withRetry(async () => {
                const doc = await CajaChica.findOne({ chatId });
                if (!doc) throw new Error('Caja no encontrada');
                return doc;
            });

            const saldoAnterior = caja.saldo;
            caja.saldo += cantidad;
            
            // Registrar en historial
            caja.historial.push({
                tipo: 'INGRESO',
                monto: cantidad,
                saldoAnterior,
                saldoNuevo: caja.saldo,
                fecha: new Date(),
                usuarioId: userId
            });

            await caja.save();

            return {
                success: true,
                mensaje: `✅ Se han agregado *$${cantidad.toFixed(2)}* pesos.\nNuevo saldo: *$${caja.saldo.toFixed(2)}* pesos. 💵`
            };
        } catch (error) {
            console.error('Error al agregar dinero:', error);
            return {
                success: false,
                mensaje: '❌ Error al procesar la operación.'
            };
        }
    }

    // Restar dinero
    static async restarDinero(chatId, cantidad, userId) {
        try {
            const caja = await withRetry(async () => {
                const doc = await CajaChica.findOne({ chatId });
                if (!doc) throw new Error('Caja no encontrada');
                return doc;
            });

            if (cantidad > caja.saldo) {
                return {
                    success: false,
                    mensaje: `⚠️ No puedes restar una cantidad mayor al saldo actual de la caja chica (*$${caja.saldo.toFixed(2)}* pesos).`
                };
            }

            const saldoAnterior = caja.saldo;
            caja.saldo -= cantidad;
            
            // Registrar en historial
            caja.historial.push({
                tipo: 'EGRESO',
                monto: cantidad,
                saldoAnterior,
                saldoNuevo: caja.saldo,
                fecha: new Date(),
                usuarioId: userId
            });

            await caja.save();

            return {
                success: true,
                mensaje: `✅ Se han restado *$${cantidad.toFixed(2)}* pesos.\nNuevo saldo: *$${caja.saldo.toFixed(2)}* pesos. 💸`
            };
        } catch (error) {
            console.error('Error al restar dinero:', error);
            return {
                success: false,
                mensaje: '❌ Error al procesar la operación.'
            };
        }
    }

    // Eliminar caja
    static async eliminarCaja(chatId, userId) {
        try {
            const caja = await CajaChica.findOneAndDelete({ chatId });
            
            if (!caja) {
                return {
                    success: false,
                    mensaje: '⚠️ No se encontró la caja para eliminar.'
                };
            }

            return {
                success: true,
                mensaje: '✅ Caja eliminada exitosamente.\nUsa /sup para iniciar una nueva caja cuando lo necesites.'
            };
        } catch (error) {
            console.error('Error al eliminar caja:', error);
            return {
                success: false,
                mensaje: '❌ Error al eliminar la caja.'
            };
        }
    }

    // Validar monto
    static validarMonto(monto) {
        if (isNaN(monto) || monto < 0) {
            return {
                esValido: false,
                mensaje: '⚠️ Por favor, ingresa un monto válido (número positivo).'
            };
        }

        if (monto.toString().split('.')[1]?.length > 2) {
            return {
                esValido: false,
                mensaje: '⚠️ El monto no puede tener más de 2 decimales.'
            };
        }

        if (monto > 999999999) {
            return {
                esValido: false,
                mensaje: '⚠️ El monto es demasiado grande.'
            };
        }

        return { esValido: true };
    }
}

module.exports = CajaService;