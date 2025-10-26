import mongoose from 'mongoose';
import dotenv from 'dotenv'; 

dotenv.config(); // Importamos el archivo .env

const URI_DB = process.env.MONGODB_URI;

// Conectar a MongoDB
const conectarMongoDB = async () => {
    try {
        await mongoose.connect(URI_DB, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conexión a MongoDB exitosa!');
        console.log(`Conectado a: ${mongoose.connection.host}`);
    } catch (err) {
        console.error('Error conectando a MongoDB:', err.message);
        // Intentar reconectar después de 5 segundos
        setTimeout(conectarMongoDB, 5000);
    }
};

export default conectarMongoDB;
export { mongoose };

