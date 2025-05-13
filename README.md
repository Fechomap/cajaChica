# 📦 Caja Chica Bot - Documentación para Railway

Esta documentación actualizada cubre el proceso de migración y despliegue del Bot de Telegram para gestión de caja chica en la plataforma Railway.

## 📋 Índice

1. [Visión General](#visión-general)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Características](#características)
4. [Despliegue en Railway](#despliegue-en-railway)
5. [Variables de Entorno](#variables-de-entorno)
6. [Comandos del Bot](#comandos-del-bot)
7. [Arquitectura Modular](#arquitectura-modular)
8. [Mensajes Automáticos](#mensajes-automáticos)
9. [Desarrollo Local](#desarrollo-local)
10. [Solución de Problemas](#solución-de-problemas)

## Visión General

Caja Chica Bot es una aplicación Node.js que permite gestionar fondos de caja chica a través de Telegram. La aplicación se ha migrado de Heroku a Railway, manteniendo todas sus funcionalidades pero aprovechando las ventajas de la plataforma Railway.

## Arquitectura del Proyecto

```
caja/
├── src/
│   ├── config/           # Configuraciones del sistema
│   ├── controllers/      # Controladores de lógica de negocio
│   ├── handlers/         # Manejadores de eventos Telegram
│   ├── models/           # Modelos de MongoDB
│   ├── services/         # Servicios para operaciones
│   ├── middleware/       # Middleware (autenticación)
│   ├── utils/            # Utilidades
│   ├── routes/           # Rutas Express
│   ├── jobs/             # Tareas programadas
│   └── app.js            # Aplicación principal
├── index.js              # Punto de entrada
├── .env                  # Variables de entorno (local)
├── Procfile              # Configuración para Railway
└── package.json          # Dependencias
```

## Características

- 💰 Gestión completa de saldo de caja chica
- 👥 Sistema de supervisores autorizados
- 🧮 Operaciones de agregar/restar dinero
- 📱 Integración con WhatsApp para compartir información bancaria
- ⏰ Sistema de mensajes automáticos programados
- 🔄 Manejo automático de migración de grupos a supergrupos
- 🌐 Configuración automática de webhooks en Railway

## Despliegue en Railway

### Prerrequisitos

- Cuenta en [Railway](https://railway.app/)
- Repositorio Git con el código del proyecto
- Token de bot de Telegram (obtenido a través de [@BotFather](https://t.me/BotFather))
- Base de datos MongoDB (puede ser desplegada en Railway o externamente)

### Pasos para el Despliegue

1. **Crear un proyecto en Railway**:
   - Inicia sesión en Railway y crea un nuevo proyecto
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio

2. **Configurar variables de entorno**:
   - En la pestaña "Variables", agrega las siguientes variables:
     ```
     TELEGRAM_TOKEN=tu_token_de_telegram
     MONGODB_URI=tu_uri_de_mongodb
     NODE_ENV=production
     ```

3. **Configuración automática**:
   - Railway proporcionará automáticamente las siguientes variables que el bot utilizará:
     ```
     RAILWAY_ENVIRONMENT_NAME
     RAILWAY_PROJECT_ID
     RAILWAY_PUBLIC_DOMAIN
     RAILWAY_STATIC_URL
     PORT
     ```

4. **Verificar el despliegue**:
   - Una vez desplegado, verifica los logs en la pestaña "Deployments"
   - Deberías ver mensajes como "Servidor escuchando en el puerto X" y "Webhook configurado correctamente"

5. **Comprobar funcionamiento**:
   - Envía el comando `/saldo` a tu bot en Telegram
   - Si responde, la configuración fue exitosa

### Ventajas de Railway vs Heroku

- No tiene el "sleep time" de los planes gratuitos de Heroku
- Proceso de despliegue más sencillo y rápido
- Mejor manejo de variables de entorno y webhooks
- Estadísticas y monitoreo mejorados
- Restauración automática en caso de caídas

## Variables de Entorno

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `TELEGRAM_TOKEN` | Token de acceso del bot de Telegram | ✅ |
| `MONGODB_URI` | URI de conexión a MongoDB | ✅ |
| `NODE_ENV` | Entorno (production/development) | ✅ |
| `PORT` | Puerto del servidor (proporcionado por Railway) | ⚙️ Auto |
| `RAILWAY_PUBLIC_DOMAIN` | Dominio público (proporcionado por Railway) | ⚙️ Auto |
| `RAILWAY_STATIC_URL` | URL estática (proporcionado por Railway) | ⚙️ Auto |
| `RAILWAY_PROJECT_ID` | ID del proyecto (proporcionado por Railway) | ⚙️ Auto |

## Comandos del Bot

### Para Todos los Usuarios
- `/saldo` - Consultar el saldo actual de la caja chica
- `/cuenta` - Obtener información bancaria con opción para compartir vía WhatsApp

### Para Supervisores
- `/sup` - Acceder al menú de supervisores con opciones:
  - 🏁 Iniciar Caja - Configurar el saldo inicial
  - ➕ Agregar Dinero - Aumentar el saldo actual
  - ➖ Restar Dinero - Disminuir el saldo actual
  - 💰 Ver Saldo - Consultar el saldo actual

## Arquitectura Modular

### Sistema de Controladores
La aplicación implementa el patrón MVC:

- **Controllers**: Manejan la lógica de negocio específica
  - `saldoController.js` - Gestión de consultas de saldo
  - `cuentaController.js` - Gestión de información bancaria
  - `supervisorController.js` - Operaciones de supervisores

- **Services**: Encapsulan operaciones específicas
  - `cajaService.js` - Operaciones de base de datos
  - `telegramService.js` - Interacciones con Telegram API

- **Handlers**: Manejan eventos del bot
  - `messageHandler.js` - Procesa mensajes de texto
  - `callbackHandler.js` - Procesa interacciones con botones

### Sistema de Autenticación
- Autenticación basada en IDs de usuario de Telegram
- Lista de supervisores autorizados en las variables de entorno
- Validaciones de permisos para cada operación sensible

## Mensajes Automáticos

El sistema envía mensajes automáticos a todos los grupos donde está configurada una caja chica:

- **Frecuencia**: 4 veces al día (1:00 AM, 7:00 AM, 1:00 PM, 7:00 PM - Hora de Ciudad de México)
- **Contenido**:
  1. Saldo actual de la caja
  2. Recordatorio para reportar gastos y casetas
  3. Instrucciones para enviar comprobantes

Los mensajes automáticos se configuran en `src/jobs/scheduledMessages.js` utilizando `node-cron`.

## Desarrollo Local

### Instalación

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd caja

# Instalar dependencias
npm install

# Copiar el archivo de entorno de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
# TELEGRAM_TOKEN=tu_token
# MONGODB_URI=tu_conexion_mongodb
```

### Ejecución en Modo Desarrollo

En modo desarrollo, el bot utiliza polling en lugar de webhooks:

```bash
npm run dev
```

### Pruebas

```bash
# No hay pruebas automatizadas configuradas todavía
npm test
```

## Solución de Problemas

### Webhook no se configura correctamente
- Verifica que RAILWAY_PUBLIC_DOMAIN esté correctamente generado
- Comprueba que la URL del webhook comience con `https://`
- Revisa los logs para errores específicos
- Utiliza el endpoint `/health` para verificar si el servidor está respondiendo

### Bot no responde en Telegram
- Verifica que el token sea correcto
- Asegúrate de que el bot no esté bloqueado por el usuario
- Comprueba la conectividad a MongoDB
- Revisa los logs de Railway para errores

### Migración de Grupos
Si un grupo se actualiza a supergrupo, el bot maneja automáticamente la migración:
- Detecta el error `migrate_to_chat_id`
- Actualiza la referencia del chatId en la base de datos
- Reenvía el mensaje al nuevo chatId

### Errores de Conexión a MongoDB
- Verifica que la URI de MongoDB sea correcta
- Asegúrate de que las credenciales sean válidas
- Comprueba que las IPs estén permitidas en la configuración de red de MongoDB Atlas

---

Para más información o soporte, por favor abre un issue en el repositorio del proyecto.