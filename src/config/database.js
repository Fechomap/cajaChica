// src/config/database.js
const mongoose = require('mongoose');
const environment = require('./environment');

const connectDB = async () => {
  try {
    await mongoose.connect(environment.database.uri);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;