// models/CajaChica.js
const mongoose = require('mongoose');

const CajaChicaSchema = new mongoose.Schema({
    chatId: { type: Number, required: true, unique: true },
    saldo: { type: Number, required: true }
});

module.exports = mongoose.model('CajaChica', CajaChicaSchema);