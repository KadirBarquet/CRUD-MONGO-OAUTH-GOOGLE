import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import passport from 'passport';
import './config/passport.js';
import conectarMongoDB from './db.js';
import Usuario from './models/Usuario.js';
import { verificarToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

console.log('FRONTEND_URL configurado:', FRONTEND_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// ==================== MIDDLEWARE ====================

// CORS simplificado y permisivo para debugging
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (Postman, curl)
    if (!origin) return callback(null, true);
    
    console.log('Origin recibido:', origin);
    
    // Lista de origenes permitidos
    const allowed = [
      'http://localhost:3000',
      'https://crud-mongo-oauth-google-5vhyvqtxe-kadirbarquets-projects.vercel.app',
      FRONTEND_URL
    ];
    
    // Permitir cualquier subdominio de vercel.app
    if (origin.includes('vercel.app') || allowed.includes(origin)) {
      console.log('Origin permitido:', origin);
      return callback(null, true);
    }
    
    console.log('Origin rechazado:', origin);
    callback(null, true); // TEMPORAL: permitir todo para debugging
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 horas
}));

// Logging middleware para debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', {
    origin: req.headers.origin,
    authorization: req.headers.authorization ? 'Presente' : 'Ausente',
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'tu_session_secret_seguro',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

app.use(passport.initialize());
app.use(passport.session());

conectarMongoDB();

// ==================== RUTAS PÚBLICAS ====================

app.get('/', (req, res) => {
  res.json({
    mensaje: 'Servidor Express funcionando!',
    estado: 'Backend listo para MongoDB + JWT + OAuth',
    timestamp: new Date().toISOString(),
    frontend: FRONTEND_URL,
  });
});

// ==================== AUTENTICACIÓN LOCAL ====================

app.post('/registro', async (req, res) => {
  try {
    console.log('POST /registro - Body:', req.body);
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        error: 'No se recibió body en la petición o no es un objeto.',
      });
    }

    const { nombre, correo, contrasenia } = req.body;

    if (!nombre || !correo || !contrasenia) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (typeof nombre !== 'string' || nombre.length < 2) {
      return res.status(400).json({
        error: 'El nombre debe tener al menos 2 caracteres',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof correo !== 'string' || !emailRegex.test(correo)) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    if (typeof contrasenia !== 'string' || contrasenia.length < 8) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    const nuevoUsuario = new Usuario({
      nombre,
      correo,
      contrasenia,
      tipoAutenticacion: 'local',
    });

    await nuevoUsuario.save();
    console.log('Usuario registrado:', correo);

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        _id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
      },
    });
  } catch (err) {
    console.error('Error en POST /registro:', err.message);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ error: mensajes });
    }

    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/login', async (req, res) => {
  try {
    console.log('POST /login - Body:', req.body);
    
    const { correo, contrasenia } = req.body;

    if (!correo || !contrasenia) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const usuario = await Usuario.findOne({ correo }).select('+contrasenia');

    if (!usuario) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const esValida = await usuario.compararContrasenia(contrasenia);

    if (!esValida) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign(
      {
        usuarioId: usuario._id,
        correo: usuario.correo,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login exitoso:', correo);

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
      },
    });
  } catch (err) {
    console.error('Error en POST /login:', err.message);
    res.status(500).json({ error: 'Error al autenticar usuario' });
  }
});

// ==================== RUTAS OAUTH - GOOGLE ====================

app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/?error=auth_failed`,
  }),
  (req, res) => {
    console.log('OAuth callback exitoso');
    const usuario = req.user;

    const token = jwt.sign(
      {
        usuarioId: usuario._id,
        correo: usuario.correo,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const usuarioData = encodeURIComponent(
      JSON.stringify({
        _id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        fotoPerfil: usuario.fotoPerfil,
      })
    );

    console.log('Redirigiendo a:', `${FRONTEND_URL}/?token=${token.substring(0, 20)}...`);
    res.redirect(`${FRONTEND_URL}/?token=${token}&usuario=${usuarioData}`);
  }
);

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
  });
});

// ==================== RUTAS PROTEGIDAS ====================

app.get('/perfil', verificarToken, async (req, res) => {
  try {
    console.log('GET /perfil - Usuario:', req.usuarioId);
    
    const usuario = await Usuario.findById(req.usuarioId).select('-contrasenia');

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      mensaje: 'Datos del perfil',
      usuario,
    });
  } catch (err) {
    console.error('Error en GET /perfil:', err.message);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

app.get('/usuarios', verificarToken, async (req, res) => {
  try {
    console.log('GET /usuarios - Usuario autenticado:', req.usuarioId);

    const usuarios = await Usuario.find().select(
      'nombre correo fotoPerfil fechaRegistro _id tipoAutenticacion'
    );

    console.log(`Se encontraron ${usuarios.length} usuarios`);

    res.json({
      total: usuarios.length,
      usuarios,
    });
  } catch (err) {
    console.error('Error en GET /usuarios:', err.message);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

app.get('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('GET /usuarios/:id - ID:', id);

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const usuario = await Usuario.findById(id).select('-contrasenia');

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      mensaje: 'Usuario encontrado',
      usuario,
    });
  } catch (err) {
    console.error('Error en GET /usuarios/:id:', err.message);
    res.status(500).json({ error: 'Error al buscar usuario' });
  }
});

app.put('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, contrasenia } = req.body;
    console.log('PUT /usuarios/:id - ID:', id, 'Body:', { nombre, correo });

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (nombre && typeof nombre !== 'string') {
      return res.status(400).json({ error: 'El nombre debe ser texto' });
    }

    if (correo && typeof correo !== 'string') {
      return res.status(400).json({ error: 'El correo debe ser texto' });
    }

    if (contrasenia && typeof contrasenia !== 'string') {
      return res.status(400).json({ error: 'La contraseña debe ser texto' });
    }

    if (contrasenia && contrasenia.length < 8) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    const dataActualizar = { nombre, correo };
    if (contrasenia) {
      dataActualizar.contrasenia = contrasenia;
    }

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      id,
      dataActualizar,
      { new: true, runValidators: true }
    ).select('-contrasenia');

    if (!usuarioActualizado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('Usuario actualizado:', usuarioActualizado.correo);

    res.json({
      mensaje: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado,
    });
  } catch (err) {
    console.error('Error en PUT /usuarios/:id:', err.message);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ error: mensajes });
    }

    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

app.post('/usuarios', verificarToken, async (req, res) => {
  try {
    const { nombre, correo, contrasenia } = req.body;
    console.log('POST /usuarios - Body:', { nombre, correo });

    if (!nombre || !correo || !contrasenia) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (typeof nombre !== 'string' || nombre.length < 2) {
      return res.status(400).json({
        error: 'El nombre debe tener al menos 2 caracteres',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof correo !== 'string' || !emailRegex.test(correo)) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    if (typeof contrasenia !== 'string' || contrasenia.length < 8) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    const nuevoUsuario = new Usuario({
      nombre,
      correo,
      contrasenia,
      tipoAutenticacion: 'local',
    });

    await nuevoUsuario.save();
    console.log('Usuario creado:', correo);

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        _id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
      },
    });
  } catch (err) {
    console.error('Error en POST /usuarios:', err.message);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ error: mensajes });
    }

    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

app.delete('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('DELETE /usuarios/:id - ID:', id);

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const usuarioEliminado = await Usuario.findByIdAndDelete(id);

    if (!usuarioEliminado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('Usuario eliminado:', usuarioEliminado.correo);

    res.json({
      mensaje: 'Usuario eliminado exitosamente',
      usuarioEliminado: {
        _id: usuarioEliminado._id,
        nombre: usuarioEliminado.nombre,
        correo: usuarioEliminado.correo,
      },
    });
  } catch (err) {
    console.error('Error en DELETE /usuarios/:id:', err.message);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// ==================== SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`
==============================================
Servidor corriendo en puerto ${PORT}
==============================================
- Autenticación JWT activada
- OAuth Google configurado
- Backend listo con MongoDB + Seguridad
- CORS configurado para: ${FRONTEND_URL}
- Modo: ${process.env.NODE_ENV || 'development'}
==============================================
  `);
});