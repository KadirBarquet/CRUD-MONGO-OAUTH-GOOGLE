import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Usuario from '../models/Usuario.js';
import dotenv from 'dotenv';

dotenv.config();

// CRÍTICO: callbackURL debe ser absoluta en producción
const CALLBACK_URL = process.env.NODE_ENV === 'production'
  ? 'https://crud-mongo-oauth-google.onrender.com/auth/google/callback'
  : 'http://localhost:5000/auth/google/callback';

console.log('OAuth Callback URL:', CALLBACK_URL);

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

        // Buscar si el usuario ya existe
        let usuario = await Usuario.findOne({ googleId: id });

        if (usuario) {
          console.log('✅ Usuario existente encontrado:', usuario.correo);
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
  done(null, usuario._id);
});

// Deserializar usuario desde la sesión
passport.deserializeUser(async (id, done) => {
  try {
    const usuario = await Usuario.findById(id);
    done(null, usuario);
  } catch (err) {
    done(err);
  }
});

export default passport;