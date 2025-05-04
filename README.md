# 📦 Caja Chica Bot

Bot de Telegram para gestión de caja chica con arquitectura modular y soporte para despliegue en Railway.

## 🚀 Características

- 💰 Gestión de saldo de caja chica
- 👤 Sistema de roles (Supervisores)
- 🔄 Operaciones de agregar/restar dinero
- 💬 Envío de información bancaria vía WhatsApp
- ⏰ Mensajes automáticos programados
- 🗄️ Persistencia de datos con MongoDB
- 🌐 Soporte para webhook (producción) y polling (desarrollo)
- 🔄 Manejo automático de migración de chats a supergrupos

## 📂 Estructura del Proyecto

```
caja/
├── src/
│   ├── config/
│   │   ├── bot.js              # Configuración del bot
│   │   ├── database.js         # Conexión a MongoDB
│   │   └── environment.js      # Variables de entorno
│   ├── controllers/
│   │   ├── saldoController.js  # Manejo de saldos
│   │   ├── cuentaController.js # Manejo de cuentas bancarias
│   │   └── supervisorController.js # Operaciones de supervisores
│   ├── handlers/
│   │   ├── callbackHandler.js  # Manejo de callbacks
│   │   └── messageHandler.js   # Manejo de mensajes
│   ├── models/
│   │   └── CajaChica.js       # Modelo de datos
│   ├── services/
│   │   ├── cajaService.js     # Lógica de negocio
│   │   └── telegramService.js # Servicios de Telegram
│   ├── middleware/
│   │   └── authMiddleware.js  # Autenticación
│   ├── utils/
│   │   ├── messageHelper.js   # Utilidades de mensajes
│   │   └── webhookHelper.js   # Utilidades de webhook
│   ├── routes/
│   │   └── webhookRoutes.js   # Rutas Express
│   ├── jobs/
│   │   └── scheduledMessages.js # Tareas programadas
│   └── app.js                 # Configuración de la aplicación
├── index.js                   # Punto de entrada
├── .env
├── .gitignore
├── package.json
├── Procfile
└── README.md
```

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone <tu-repositorio>
cd CAJA
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```

4. Edita el archivo `.env` con tus credenciales:
```env
TELEGRAM_TOKEN=tu_token_de_telegram
APP_URL=tu_url_en_railway
MONGODB_URI=tu_uri_de_mongodb
PORT=3000
SUPERVISORES_IDS=7143094298,6330970125
```

## 🚀 Despliegue en Railway

1. Conecta tu repositorio con Railway
2. Configura las variables de entorno en Railway:
   - `TELEGRAM_TOKEN`
   - `MONGODB_URI`
   - `APP_URL` (se genera automáticamente)
   - `SUPERVISORES_IDS`
3. Despliega

Railway detectará automáticamente el `Procfile` y configurará el webhook.

## 💻 Desarrollo Local

Para desarrollo local con polling:
```bash
npm run dev
```

Para producción con webhook:
```bash
npm start
```

## 📱 Comandos del Bot

### Comandos generales:
- `/saldo` - Ver saldo actual
- `/cuenta` - Obtener información bancaria

### Comandos de supervisores:
- `/sup` - Acceder al menú de supervisores

### Operaciones de supervisores:
- 🏁 Iniciar Caja
- ➕ Agregar Dinero
- ➖ Restar Dinero
- 💰 Ver Saldo

## ⏰ Mensajes Automáticos

El bot envía mensajes automáticos a todos los grupos en los siguientes horarios (Ciudad de México):
- 01:00 AM
- 07:00 AM
- 01:00 PM
- 07:00 PM

Los mensajes incluyen:
- Saldo actual
- Recordatorio para reportar gastos/casetas

## 🔒 Seguridad

- Autenticación basada en IDs de usuario
- Validación de permisos para operaciones sensibles
- Confirmación para operaciones financieras

## 🌐 Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `TELEGRAM_TOKEN` | Token del bot de Telegram |
| `MONGODB_URI` | URI de conexión a MongoDB |
| `APP_URL` | URL base de la aplicación |
| `PORT` | Puerto del servidor (default: 3000) |
| `SUPERVISORES_IDS` | IDs de Telegram de supervisores autorizados |

## 📄 Licencia

ISC

## 🤝 Contribuir

1. Haz un fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🐛 Reporte de Bugs

Si encuentras algún bug, por favor abre un issue describiendo:
- Pasos para reproducir el error
- Comportamiento esperado
- Capturas de pantalla si es posible

## 📞 Soporte

Para soporte, abre un issue en el repositorio.

---

Hecho con ❤️ para gestión de caja chica