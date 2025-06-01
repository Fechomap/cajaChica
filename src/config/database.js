// src/config/database.js
const environment = require('./environment');
const prisma = require('../lib/prisma');

const connectDB = async () => {
  try {
    // Conectar a PostgreSQL
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL con Prisma');
    
    // Verificar la conexión
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexión PostgreSQL verificada');
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error);
    process.exit(1);
  }
};

// Desconectar base de datos
const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ Desconectado de PostgreSQL');
  } catch (error) {
    console.error('❌ Error al desconectar:', error);
  }
};

module.exports = { connectDB, disconnectDB };