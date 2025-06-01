# Guía de Migración a PostgreSQL con Prisma

## 🚀 Resumen de la Refactorización

### Cambios Principales

1. **Base de Datos**: Migración de MongoDB a PostgreSQL
2. **ORM**: Mongoose → Prisma
3. **Arquitectura**: Sistema multitenant con organizaciones
4. **Servicios**: Separación completa de responsabilidades
5. **Autenticación**: Sistema de roles y permisos mejorado

### Nueva Estructura

```
src/
├── repositories/     # Capa de acceso a datos
├── services/        # Lógica de negocio
├── controllers/     # Controladores de comandos
├── middleware/      # Autenticación y autorización
├── utils/          # Utilidades
└── lib/            # Configuraciones (Prisma)
```

## 📋 Pasos para Configurar PostgreSQL Local

### 1. Instalar PostgreSQL

```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Crear Base de Datos

```bash
# Acceder a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE caja_chica;

# Crear usuario (opcional)
CREATE USER caja_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE caja_chica TO caja_user;
```

### 3. Configurar Variables de Entorno

Actualizar `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/caja_chica?schema=public"
```

### 4. Ejecutar Migraciones

```bash
# Generar migración inicial
npx prisma migrate dev --name init

# Ver el estado de las migraciones
npx prisma migrate status

# Generar cliente de Prisma
npx prisma generate
```

## 🔄 Migración de Datos desde MongoDB

### Script de Migración (Opcional)

```javascript
// migrate-data.js
const { MongoClient } = require('mongodb');
const { PrismaClient } = require('@prisma/client');

async function migrateData() {
  const mongo = new MongoClient(process.env.MONGODB_URI);
  const prisma = new PrismaClient();
  
  try {
    await mongo.connect();
    const db = mongo.db();
    
    // Migrar cajas a grupos
    const cajas = await db.collection('cajachicas').find({}).toArray();
    
    for (const caja of cajas) {
      // Crear organización por defecto si no existe
      const org = await prisma.organization.findFirst({
        where: { slug: 'default' }
      });
      
      // Crear grupo
      await prisma.group.create({
        data: {
          telegramId: BigInt(caja.chatId),
          organizationId: org.id,
          title: 'Grupo Migrado',
          type: 'GROUP',
          balance: caja.saldo,
          isInitialized: true,
          initialBalance: caja.saldo
        }
      });
      
      // Migrar transacciones
      for (const trans of caja.transacciones) {
        await prisma.transaction.create({
          data: {
            groupId: group.id,
            userId: defaultUser.id, // Necesitarás mapear usuarios
            type: trans.tipo === 'ingreso' ? 'INCOME' : 'EXPENSE',
            amount: trans.monto,
            concept: trans.concepto || 'Sin concepto',
            balanceAfter: trans.saldoDespues,
            createdAt: trans.fecha
          }
        });
      }
    }
    
    console.log('✅ Migración completada');
  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}
```

## 🚀 Despliegue en Railway

### 1. Agregar PostgreSQL

1. En Railway, agregar servicio PostgreSQL
2. Copiar `DATABASE_URL` del servicio
3. Agregar variable en el servicio del bot

### 2. Variables de Entorno en Railway

```env
DATABASE_URL=postgresql://...  # De tu servicio PostgreSQL
BOT_TOKEN=tu_token_de_telegram
DEFAULT_ORG_SLUG=default
NODE_ENV=production
```

### 3. Configurar Build Command

En Railway settings:
```
Build Command: npx prisma generate && npm run build
Start Command: npx prisma migrate deploy && npm start
```

## 🧪 Pruebas

### Ejecutar Script de Prueba

```bash
node test-refactor.js
```

### Probar Bot Localmente

```bash
# Modo desarrollo con polling
npm run dev
```

## 📝 Cambios en los Comandos

### Comandos Actualizados

- `/saldo` - Ahora verifica permisos por organización
- `/cuenta` - Muestra info bancaria de la organización
- `/sup` - Solo disponible para supervisores del grupo

### Nuevas Funcionalidades

1. **Multitenant**: Cada organización tiene sus propios grupos y datos
2. **Roles**: OWNER, ADMIN, SUPERVISOR, MEMBER
3. **Límites**: Por plan (grupos, usuarios, transacciones)
4. **Auditoría**: Logs de todas las acciones

## ⚠️ Consideraciones Importantes

1. **Compatibilidad**: El sistema mantiene compatibilidad con supervisores legacy
2. **IDs de Telegram**: Se manejan como BigInt en Prisma
3. **Decimales**: Los montos usan tipo Decimal para precisión
4. **Estados**: Temporalmente en memoria (migrar a Redis en el futuro)

## 🔍 Troubleshooting

### Error: "relation does not exist"
```bash
# Ejecutar migraciones
npx prisma migrate dev
```

### Error: "BigInt serialization"
```javascript
// Agregar en index.js
BigInt.prototype.toJSON = function() { 
  return this.toString() 
}
```

### Error: "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

## 📚 Siguientes Pasos

1. **Redis**: Implementar para estados persistentes
2. **Tests**: Agregar suite de pruebas completa
3. **API REST**: Exponer endpoints para dashboard
4. **Webhooks**: Sistema de eventos para integraciones
5. **Métricas**: Dashboard de uso y analytics