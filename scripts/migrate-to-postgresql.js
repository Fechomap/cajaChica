#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
require('dotenv').config();

const prisma = new PrismaClient();

async function migrateData() {
  console.log('🚀 Iniciando migración de MongoDB a PostgreSQL...');
  
  // 1. Buscar el backup más reciente
  const backupsDir = path.join(__dirname, '../backups');
  const backupFiles = fs.readdirSync(backupsDir)
    .filter(file => file.endsWith('.json') && !file.includes('stats'))
    .sort()
    .reverse();
  
  if (backupFiles.length === 0) {
    throw new Error('No se encontraron archivos de backup');
  }
  
  const backupFile = path.join(backupsDir, backupFiles[0]);
  console.log(`📁 Usando backup: ${backupFile}`);
  
  // 2. Cargar datos del backup
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const cajas = backupData.collections.cajachicas;
  
  console.log(`📊 Datos a migrar: ${cajas.length} cajas, ${cajas.reduce((sum, c) => sum + (c.transacciones?.length || 0), 0)} transacciones`);
  
  try {
    // 3. Crear organización principal
    console.log('🏢 Creando organización principal...');
    const organization = await prisma.organization.upsert({
      where: { slug: 'fechomap-org' },
      update: {},
      create: {
        name: 'Fechomap Organization',
        slug: 'fechomap-org',
        email: 'admin@fechomap.com',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        maxGroups: 100,
        maxUsers: 50,
        maxTransactions: 10000
      }
    });
    
    console.log(`✅ Organización creada: ${organization.name} (${organization.id})`);
    
    // 4. Crear usuario principal (tú)
    console.log('👤 Creando usuario principal...');
    const mainUser = await prisma.user.upsert({
      where: { telegramId: BigInt('7143094298') },
      update: {},
      create: {
        telegramId: BigInt('7143094298'),
        username: 'fechomap',
        firstName: 'Fernando',
        role: 'OWNER',
        organizationId: organization.id,
        isActive: true
      }
    });
    
    console.log(`✅ Usuario principal creado: ${mainUser.firstName} (${mainUser.id})`);
    
    // 5. Migrar cada caja como grupo
    console.log('📦 Migrando cajas como grupos...');
    let gruposMigrados = 0;
    let transaccionesMigradas = 0;
    
    for (const caja of cajas) {
      try {
        // Crear grupo
        const group = await prisma.group.create({
          data: {
            telegramId: BigInt(caja.chatId),
            organizationId: organization.id,
            title: `Grupo ${Math.abs(caja.chatId)}`,
            type: caja.chatId > 0 ? 'PRIVATE' : 'GROUP',
            balance: caja.saldo || 0,
            isInitialized: true,
            initialBalance: caja.saldo || 0
          }
        });
        
        console.log(`  ✅ Grupo migrado: ${group.title} (${group.telegramId}) - Saldo: $${group.balance}`);
        gruposMigrados++;
        
        // Migrar transacciones
        if (caja.transacciones && caja.transacciones.length > 0) {
          for (const transaccion of caja.transacciones) {
            await prisma.transaction.create({
              data: {
                groupId: group.id,
                userId: mainUser.id, // Asignar todas las transacciones al usuario principal
                type: transaccion.tipo === 'ingreso' ? 'INCOME' : 'EXPENSE',
                amount: transaccion.monto,
                concept: transaccion.concepto || 'Sin concepto',
                balanceAfter: transaccion.saldoDespues || 0,
                createdAt: transaccion.fecha ? new Date(transaccion.fecha) : new Date()
              }
            });
            transaccionesMigradas++;
          }
          console.log(`    💰 ${caja.transacciones.length} transacciones migradas`);
        }
        
        // Asignar usuario como supervisor del grupo
        await prisma.groupSupervisor.create({
          data: {
            groupId: group.id,
            userId: mainUser.id
          }
        });
        
      } catch (error) {
        console.error(`❌ Error migrando caja ${caja.chatId}:`, error.message);
      }
    }
    
    // 6. Crear información bancaria por defecto
    console.log('🏦 Creando información bancaria...');
    await prisma.bankInfo.upsert({
      where: { organizationId: organization.id },
      update: {},
      create: {
        organizationId: organization.id,
        bankName: 'BBVA',
        accountHolder: 'Alfredo Alejandro Perez Aguilar',
        accountNumber: '1582680561',
        clabe: '012180015826805612',
        debitCard: '4152314307139520',
        encrypted: false // Por ahora, después implementaremos encriptación
      }
    });
    
    console.log('✅ Información bancaria creada');
    
    // 7. Estadísticas finales
    const stats = {
      organizacion: organization.name,
      gruposMigrados,
      transaccionesMigradas,
      saldoTotal: cajas.reduce((sum, c) => sum + (c.saldo || 0), 0)
    };
    
    console.log('\n🎉 Migración completada exitosamente!');
    console.log('📊 Estadísticas:');
    console.log(`  • Organización: ${stats.organizacion}`);
    console.log(`  • Grupos migrados: ${stats.gruposMigrados}`);
    console.log(`  • Transacciones migradas: ${stats.transaccionesMigradas}`);
    console.log(`  • Saldo total: $${stats.saldoTotal.toFixed(2)}`);
    
    // Guardar reporte de migración
    const reportPath = path.join(__dirname, '../backups', `migration-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
    console.log(`📄 Reporte guardado en: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateData().catch(error => {
    console.error('💥 Migración fallida:', error);
    process.exit(1);
  });
}

module.exports = { migrateData };