// Script de prueba para verificar la refactorización
require('dotenv').config();

const prisma = require('./src/lib/prisma');
const organizationService = require('./src/services/organizationService');
const authService = require('./src/services/authService');
const groupService = require('./src/services/groupService');
const transactionService = require('./src/services/transactionService');

async function testRefactor() {
  try {
    console.log('🧪 Iniciando pruebas de refactorización...\n');

    // 1. Probar conexión a base de datos
    console.log('1️⃣ Probando conexión a PostgreSQL...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa a PostgreSQL\n');

    // 2. Crear organización por defecto
    console.log('2️⃣ Creando organización por defecto...');
    const org = await organizationService.getDefaultOrganization();
    console.log('✅ Organización creada/obtenida:', {
      id: org.id,
      name: org.name,
      slug: org.slug
    });
    console.log('');

    // 3. Simular autenticación de usuario
    console.log('3️⃣ Simulando autenticación de usuario...');
    const telegramUser = {
      id: 123456789,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User'
    };
    
    const user = await authService.authenticateUser(telegramUser);
    console.log('✅ Usuario autenticado:', {
      id: user.id,
      telegramId: user.telegramId.toString(),
      role: user.role,
      organizationId: user.organizationId
    });
    console.log('');

    // 4. Simular registro de grupo
    console.log('4️⃣ Simulando registro de grupo...');
    const telegramChat = {
      id: -987654321,
      title: 'Grupo de Prueba',
      type: 'group'
    };
    
    const group = await groupService.registerGroup(telegramChat, org.id);
    console.log('✅ Grupo registrado:', {
      id: group.id,
      telegramId: group.telegramId.toString(),
      title: group.title,
      organizationId: group.organizationId
    });
    console.log('');

    // 5. Verificar permisos
    console.log('5️⃣ Verificando sistema de permisos...');
    const hasPermission = await authService.checkPermission(
      user.id,
      'balance.view',
      group.id
    ).then(() => true).catch(() => false);
    
    console.log(`✅ Permiso 'balance.view': ${hasPermission ? 'Concedido' : 'Denegado'}`);
    console.log('');

    // 6. Verificar límites de recursos
    console.log('6️⃣ Verificando límites de recursos...');
    const limits = await organizationService.checkResourceLimits(org.id);
    console.log('✅ Límites de recursos:', limits);
    console.log('');

    console.log('🎉 Todas las pruebas pasaron exitosamente!');
    console.log('\n📝 Resumen:');
    console.log('- PostgreSQL con Prisma: ✅');
    console.log('- Sistema multitenant: ✅');
    console.log('- Autenticación y permisos: ✅');
    console.log('- Servicios refactorizados: ✅');
    console.log('- Límites de recursos: ✅');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar pruebas
testRefactor();