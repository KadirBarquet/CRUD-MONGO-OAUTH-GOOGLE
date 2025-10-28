import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Usuario from '../models/Usuario.js';
import dotenv from 'dotenv';

dotenv.config();

// CRÍTICO: Usar variable de entorno para la URL del backend
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const CALLBACK_URL = `${BACKEND_URL}/auth/google/callback`;

console.log('OAuth Config:');
console.log('  - Backend URL:', BACKEND_URL);
console.log('  - Callback URL:', CALLBACK_URL);
console.log('  - Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
console.log('  - Environment:', process.env.NODE_ENV);

// Configurar estrategia de Google
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
      proxy: true, // IMPORTANTE: necesario para Render/Heroku
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos } = profile;

        console.log('Google OAuth - Usuario autenticando:', emails[0].value);

        // Buscar si el usuario ya existe
        let usuario = await Usuario.findOne({ googleId: id });

        if (usuario) {
          console.log('Usuario existente encontrado:', usuario.correo);
          return done(null, usuario);
        }

        // Si no existe, crear nuevo usuario
        usuario = new Usuario({
          nombre: displayName || emails[0].value.split('@')[0],
          correo: emails[0].value,
          googleId: id,
          fotoPerfil: photos[0]?.value || null,
          tipoAutenticacion: 'google',
        });

        await usuario.save();
        console.log('Nuevo usuario creado:', usuario.correo);
        return done(null, usuario);
      } catch (err) {
        console.error('Error en estrategia Google:', err.message);
        return done(err);
      }
    }
  )
);

// Serializar usuario para la sesión
passport.serializeUser((usuario, done) => {
  console.log('Serializando usuario:', usuario._id);
  done(null, usuario._id);
});

// Deserializar usuario desde la sesión
passport.deserializeUser(async (id, done) => {
  try {
    const usuario = await Usuario.findById(id);
    console.log('Deserializando usuario:', usuario?.correo);
    done(null, usuario);
  } catch (err) {
    console.error('Error deserializando:', err.message);
    done(err);
  }
});

export default passport;