// src/models/CajaChica.js
const mongoose = require('mongoose');

// Esquema para transacciones
const TransaccionSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['ingreso', 'gasto'], required: true },
  monto: { type: Number, required: true },
  concepto: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  saldoDespues: { type: Number, required: false }
});

const CajaChicaSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  saldo: { type: Number, required: true },
  transacciones: [TransaccionSchema]
});

module.exports = mongoose.model('CajaChica', CajaChicaSchema);