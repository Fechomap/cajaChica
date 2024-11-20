require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { connectDB } = require('./config/database');
const { bot, setupWebhook, token } = require('./config/bot');
const CommandController = require('./controllers/commandController');
const CajaController = require('./controllers/cajaController');

const app = express();
app.use(bodyParser.json());

// Inicializar controladores
const commandController = new CommandController(bot);
const cajaController = new CajaController(bot);

// Ruta para webhooks de Telegram
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

const port = process.env.PORT || 3000;

// Iniciar servidor y configurar servicios
const initializeServer = async () => {
    try {
        // Conectar a MongoDB
        await connectDB();
        console.log('📦 Iniciando servicios...');

        // Iniciar servidor Express
        app.listen(port, async () => {
            console.log(`🤖 Bot escuchando en puerto ${port}`);

            // Configurar webhook y comandos
            await setupWebhook();
            await commandController.registerCommands();
        });

        // Manejar cierre graceful
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('🔌 Conexión a MongoDB cerrada correctamente');
                process.exit(0);
            } catch (err) {
                console.error('❌ Error al cerrar la conexión:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('❌ Error al inicializar servicios:', error);
        process.exit(1);
    }
};

initializeServer();