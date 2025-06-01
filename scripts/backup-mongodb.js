#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = path.join(__dirname, '../backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_NAME = `mongodb-backup-${TIMESTAMP}`;

// Crear directorio de backups si no existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('🔄 Iniciando backup de MongoDB...');
console.log(`📁 Directorio de backup: ${BACKUP_DIR}`);
console.log(`📋 Nombre del backup: ${BACKUP_NAME}`);

try {
  // Opción 1: Si tienes mongodump instalado localmente
  // const command = `mongodump --uri="${MONGODB_URI}" --out="${path.join(BACKUP_DIR, BACKUP_NAME)}"`;
  
  // Opción 2: Exportar datos en formato JSON (más portable)
  const mongoose = require('mongoose');
  const CajaChica = require('../src/models/CajaChica');
  
  async function backupData() {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Obtener todos los datos
    const cajas = await CajaChica.find({}).lean();
    console.log(`📊 Encontradas ${cajas.length} cajas chicas`);
    
    // Guardar en formato JSON
    const backupData = {
      timestamp: new Date().toISOString(),
      mongodbUri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Ocultar credenciales
      collections: {
        cajachicas: cajas
      }
    };
    
    const backupPath = path.join(BACKUP_DIR, `${BACKUP_NAME}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup guardado en: ${backupPath}`);
    
    // También crear un archivo de estadísticas
    const stats = {
      totalCajas: cajas.length,
      totalTransacciones: cajas.reduce((sum, caja) => sum + (caja.transacciones?.length || 0), 0),
      totalSaldo: cajas.reduce((sum, caja) => sum + (caja.saldo || 0), 0),
      cajasPorChat: cajas.map(c => ({
        chatId: c.chatId,
        saldo: c.saldo,
        transacciones: c.transacciones?.length || 0
      }))
    };
    
    const statsPath = path.join(BACKUP_DIR, `${BACKUP_NAME}-stats.json`);
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    
    console.log(`📊 Estadísticas guardadas en: ${statsPath}`);
    
    await mongoose.disconnect();
    console.log('✅ Backup completado exitosamente');
    
    return { backupPath, statsPath, stats };
  }
  
  backupData().catch(error => {
    console.error('❌ Error durante el backup:', error);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Error al ejecutar backup:', error);
  process.exit(1);
}