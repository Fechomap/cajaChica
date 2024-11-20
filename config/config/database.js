const mongoose = require('mongoose');

const mongoOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
};

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
        console.log('✅ Conexión establecida con MongoDB');
        
        mongoose.connection.on('error', (err) => {
            console.error('❌ Error en la conexión de MongoDB:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('🔌 MongoDB desconectado. Intentando reconectar...');
            setTimeout(() => {
                mongoose.connect(process.env.MONGODB_URI, mongoOptions)
                    .catch(err => console.error('❌ Error al reconectar:', err));
            }, 5000);
        });

    } catch (err) {
        console.error('❌ Error fatal al conectar con MongoDB:', err);
        process.exit(1);
    }
};

module.exports = { connectDB, mongoose };