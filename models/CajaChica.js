const mongoose = require('mongoose');

const CajaChicaSchema = new mongoose.Schema({
    chatId: { type: Number, required: true, unique: true },
    saldo: { type: Number, required: true },
    historial: [{
        tipo: { type: String, required: true },
        monto: { type: Number, required: true },
        saldoAnterior: { type: Number, required: true },
        saldoNuevo: { type: Number, required: true },
        fecha: { type: Date, default: Date.now },
        usuarioId: { type: Number }
    }]
});

module.exports = mongoose.model('CajaChica', CajaChicaSchema);