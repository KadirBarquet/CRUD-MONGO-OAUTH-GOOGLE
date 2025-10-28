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

console.log('==============================================');
console.log('CONFIGURACIÓN DEL SERVIDOR');
console.log('==============================================');
console.log('FRONTEND_URL:', FRONTEND_URL);
console.log('BACKEND_URL:', process.env.BACKEND_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('==============================================');

// ==================== MIDDLEWARE ====================

// CORS CORREGIDO - Más permisivo para Vercel
app.use(cors({
  origin: function(origin, callback) {
    console.log('Origin recibido:', origin);
    
    // Permitir requests sin origin (mobile apps, Postman, curl)
    if (!origin) {
      console.log('Sin origin - permitido');
      return callback(null, true);
    }
    
    // Lista de origenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      process.env.FRONTEND_URL,
      // Permitir cualquier subdominio de vercel.app
    ];
    
    // Verificar si es un subdominio de vercel.app o está en la lista
    if (origin.includes('vercel.app') || allowedOrigins.includes(origin)) {
      console.log('Origin permitido:', origin);
      return callback(null, true);
    }
    
    console.log('Origin no reconocido pero permitido:', origin);
    // PERMITIR TODO en producción para debugging
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Logging middleware mejorado
app.use((req, res, next) => {
  console.log(`\n${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin || 'No origin');
  console.log('Auth:', req.headers.authorization ? 'Presente' : 'Ausente');
  console.log('Cookies:', req.headers.cookie ? 'Presente' : 'Ausente');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy en producción (IMPORTANTE para Render)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Configuración de sesión mejorada
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu_session_secret_seguro',
  resave: false,
  saveUninitialized: false,
  proxy: true, // IMPORTANTE para Render
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // HTTPS solo en producción
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' para cross-site
    domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Conectar a MongoDB
conectarMongoDB();

// ==================== RUTAS PÚBLICAS ====================

app.get('/', (req, res) => {
  res.json({
    mensaje: 'Servidor Express funcionando correctamente',
    estado: 'Backend listo para MongoDB + JWT + OAuth',
    timestamp: new Date().toISOString(),
    frontend: FRONTEND_URL,
    backend: process.env.BACKEND_URL,
    environment: process.env.NODE_ENV,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== AUTENTICACIÓN LOCAL ====================

app.post('/registro', async (req, res) => {
  try {
    console.log('\nPOST /registro');
    console.log('Body recibido:', { ...req.body, contrasenia: '***' });
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        error: 'No se recibió body en la petición',
      });
    }

    const { nombre, correo, contrasenia } = req.body;

    // Validaciones
    if (!nombre || !correo || !contrasenia) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({
        error: 'El nombre debe tener al menos 2 caracteres',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof correo !== 'string' || !emailRegex.test(correo.trim())) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    if (typeof contrasenia !== 'string' || contrasenia.length < 8) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    const nuevoUsuario = new Usuario({
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
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
    console.error('Error en POST /registro:', err);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ error: mensajes });
    }

    res.status(500).json({ error: 'Error al registrar usuario: ' + err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    console.log('\nPOST /login');
    console.log('Body recibido:', { ...req.body, contrasenia: '***' });
    
    const { correo, contrasenia } = req.body;

    if (!correo || !contrasenia) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const usuario = await Usuario.findOne({ 
      correo: correo.trim().toLowerCase() 
    }).select('+contrasenia');

    if (!usuario) {
      console.log('Usuario no encontrado:', correo);
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const esValida = await usuario.compararContrasenia(contrasenia);

    if (!esValida) {
      console.log('Contraseña incorrecta para:', correo);
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
        fotoPerfil: usuario.fotoPerfil,
        tipoAutenticacion: usuario.tipoAutenticacion,
      },
    });
  } catch (err) {
    console.error('Error en POST /login:', err);
    res.status(500).json({ error: 'Error al autenticar usuario: ' + err.message });
  }
});

// ==================== RUTAS OAUTH - GOOGLE ====================

app.get(
  '/auth/google',
  (req, res, next) => {
    console.log('\nIniciando autenticación Google OAuth');
    console.log('Origin:', req.headers.origin);
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account' // Forzar selección de cuenta
  })
);

app.get(
  '/auth/google/callback',
  (req, res, next) => {
    console.log('\nCallback de Google recibido');
    console.log('Query params:', req.query);
    next();
  },
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/?error=auth_failed`,
    session: true
  }),
  (req, res) => {
    try {
      console.log('OAuth callback exitoso');
      const usuario = req.user;

      if (!usuario) {
        console.error('No hay usuario en req.user');
        return res.redirect(`${FRONTEND_URL}/?error=no_user`);
      }

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
          tipoAutenticacion: usuario.tipoAutenticacion,
        })
      );

      const redirectUrl = `${FRONTEND_URL}/?token=${token}&usuario=${usuarioData}`;
      console.log('Redirigiendo a:', redirectUrl.substring(0, 100) + '...');
      
      res.redirect(redirectUrl);
    } catch (err) {
      console.error('Error en callback:', err);
      res.redirect(`${FRONTEND_URL}/?error=callback_error`);
    }
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
    console.log('\nGET /perfil - Usuario:', req.usuarioId);
    
    const usuario = await Usuario.findById(req.usuarioId).select('-contrasenia');

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      mensaje: 'Datos del perfil',
      usuario,
    });
  } catch (err) {
    console.error('Error en GET /perfil:', err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

app.get('/usuarios', verificarToken, async (req, res) => {
  try {
    console.log('\nGET /usuarios - Usuario autenticado:', req.usuarioId);

    const usuarios = await Usuario.find().select(
      'nombre correo fotoPerfil fechaRegistro _id tipoAutenticacion'
    );

    console.log(`Se encontraron ${usuarios.length} usuarios`);

    res.json({
      total: usuarios.length,
      usuarios,
    });
  } catch (err) {
    console.error('Error en GET /usuarios:', err);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

app.get('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('\nGET /usuarios/:id - ID:', id);

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
    console.error('Error en GET /usuarios/:id:', err);
    res.status(500).json({ error: 'Error al buscar usuario' });
  }
});

app.put('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, contrasenia } = req.body;
    console.log('\nPUT /usuarios/:id - ID:', id);

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const dataActualizar = {};
    
    if (nombre) {
      if (typeof nombre !== 'string' || nombre.trim().length < 2) {
        return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
      }
      dataActualizar.nombre = nombre.trim();
    }

    if (correo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof correo !== 'string' || !emailRegex.test(correo.trim())) {
        return res.status(400).json({ error: 'Correo inválido' });
      }
      dataActualizar.correo = correo.trim().toLowerCase();
    }

    if (contrasenia) {
      if (typeof contrasenia !== 'string' || contrasenia.length < 8) {
        return res.status(400).json({
          error: 'La contraseña debe tener al menos 8 caracteres',
        });
      }
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
    console.error('Error en PUT /usuarios/:id:', err);

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
    console.log('\nPOST /usuarios - Creando usuario');

    if (!nombre || !correo || !contrasenia) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({
        error: 'El nombre debe tener al menos 2 caracteres',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof correo !== 'string' || !emailRegex.test(correo.trim())) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    if (typeof contrasenia !== 'string' || contrasenia.length < 8) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    const nuevoUsuario = new Usuario({
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
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
    console.error('Error en POST /usuarios:', err);

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
    console.log('\nDELETE /usuarios/:id - ID:', id);

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
    console.error('Error en DELETE /usuarios/:id:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// ==================== MANEJO DE ERRORES ====================

// 404 - Ruta no encontrada
app.use((req, res) => {
  console.log('404 - Ruta no encontrada:', req.path);
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    mensaje: err.message 
  });
});

// ==================== SERVIDOR ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
==============================================
SERVIDOR INICIADO CORRECTAMENTE
==============================================
- Puerto: ${PORT}
- Autenticación JWT: ACTIVADA
- OAuth Google: CONFIGURADO
- MongoDB: CONECTANDO...
- CORS: ${FRONTEND_URL}
- Modo: ${process.env.NODE_ENV || 'development'}
==============================================
  `);
});