// src/config/database.js
const mongoose = require('mongoose');
const environment = require('./environment');
const prisma = require('../lib/prisma');

const connectDB = async () => {
  try {
    // Intentar conectar a PostgreSQL primero
    if (environment.database.postgresUrl && environment.database.postgresUrl !== "postgresql://postgres:password@localhost:5432/caja_chica?schema=public") {
      try {
        await prisma.$connect();
        console.log('✅ Conectado a PostgreSQL con Prisma');
      } catch (pgError) {
        console.warn('⚠️ No se pudo conectar a PostgreSQL:', pgError.message);
        console.log('📝 Usando MongoDB como respaldo...');
      }
    }
    
    // Conectar a MongoDB
    if (environment.database.uri) {
      await mongoose.connect(environment.database.uri);
      console.log('✅ Conectado a MongoDB');
      console.log('⚠️ NOTA: Ejecutando en modo compatibilidad. Configura PostgreSQL para usar todas las funciones nuevas.');
    }
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error);
    process.exit(1);
  }
};

// Desconectar bases de datos
const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    await mongoose.disconnect();
    console.log('✅ Desconectado de las bases de datos');
  } catch (error) {
    console.error('❌ Error al desconectar:', error);
  }
};

module.exports = { connectDB, disconnectDB };