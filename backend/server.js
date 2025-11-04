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
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

console.log('==============================================');
console.log('CONFIGURACIÓN DEL SERVIDOR');
console.log('==============================================');
console.log('FRONTEND_URL:', FRONTEND_URL);
console.log('BACKEND_URL:', process.env.BACKEND_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('IS_PRODUCTION:', IS_PRODUCTION);
console.log('==============================================');

// ==================== MIDDLEWARE ====================

// Trust proxy ANTES de todo (crítico para Render)
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy activado');
}

// CORS CORREGIDO - Específico y con credentials
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      FRONTEND_URL,
      process.env.BACKEND_URL
    ].filter(Boolean);
    
    // Permitir requests sin origin (Postman, mobile)
    if (!origin) return callback(null, true);
    
    // Verificar si está permitido
    if (allowedOrigins.some(allowed => origin.includes(allowed.replace('https://', '').replace('http://', '')))) {
      console.log('✅ CORS: Origin permitido:', origin);
      return callback(null, true);
    }
    
    console.log('⚠️ CORS: Origin no permitido:', origin);
    callback(null, true); // Permitir de todas formas en producción para debugging
  },
  credentials: true, // CRÍTICO para cookies/sesiones
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie'],
  maxAge: 86400
}));

// Headers adicionales para cookies cross-origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Logging mejorado
app.use((req, res, next) => {
  console.log(`\n${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin || 'No origin');
  console.log('Referer:', req.headers.referer || 'No referer');
  console.log('User-Agent:', req.headers['user-agent']?.substring(0, 50) || 'No UA');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚠️ CONFIGURACIÓN DE SESIÓN CRÍTICA PARA OAUTH
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu_session_secret_seguro',
  resave: false,
  saveUninitialized: false,
  proxy: IS_PRODUCTION, // IMPORTANTE para Render
  name: 'sessionId', // Nombre personalizado
  cookie: { 
    secure: IS_PRODUCTION, // true en producción (HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: IS_PRODUCTION ? 'none' : 'lax', // 'none' para cross-origin en producción
    domain: IS_PRODUCTION ? undefined : undefined // No establecer domain para que funcione
  },
  rolling: true // Renovar cookie en cada request
}));

console.log('🍪 Configuración de sesión:');
console.log('  - secure:', IS_PRODUCTION);
console.log('  - sameSite:', IS_PRODUCTION ? 'none' : 'lax');
console.log('  - httpOnly: true');
console.log('  - maxAge: 24h');

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
    session: {
      hasSession: !!req.session,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    session: req.isAuthenticated ? req.isAuthenticated() : false
  });
});

// ==================== AUTENTICACIÓN LOCAL ====================

app.post('/registro', async (req, res) => {
  try {
    console.log('\n📝 POST /registro');
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'No se recibió body en la petición' });
    }

    const { nombre, correo, contrasenia } = req.body;

    if (!nombre || !correo || !contrasenia) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof correo !== 'string' || !emailRegex.test(correo.trim())) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    if (typeof contrasenia !== 'string' || contrasenia.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const nuevoUsuario = new Usuario({
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
      contrasenia,
      tipoAutenticacion: 'local',
    });

    await nuevoUsuario.save();
    console.log('✅ Usuario registrado:', correo);

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        _id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
      },
    });
  } catch (err) {
    console.error('❌ Error en POST /registro:', err);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ error: mensajes });
    }

    res.status(500).json({ error: 'Error al registrar usuario: ' + err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    console.log('\n🔐 POST /login');
    
    const { correo, contrasenia } = req.body;

    if (!correo || !contrasenia) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const usuario = await Usuario.findOne({ 
      correo: correo.trim().toLowerCase() 
    }).select('+contrasenia');

    if (!usuario) {
      console.log('❌ Usuario no encontrado:', correo);
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const esValida = await usuario.compararContrasenia(contrasenia);

    if (!esValida) {
      console.log('❌ Contraseña incorrecta para:', correo);
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

    console.log('✅ Login exitoso:', correo);

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
    console.error('❌ Error en POST /login:', err);
    res.status(500).json({ error: 'Error al autenticar usuario: ' + err.message });
  }
});

// ==================== RUTAS OAUTH - GOOGLE ====================

// Ruta para iniciar OAuth
app.get('/auth/google', (req, res, next) => {
  console.log('\n🔐 INICIANDO OAUTH GOOGLE');
  console.log('Origin:', req.headers.origin);
  console.log('Referer:', req.headers.referer);
  console.log('Session ID:', req.sessionID);
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })(req, res, next);
});

// Callback de Google
app.get('/auth/google/callback',
  (req, res, next) => {
    console.log('\n📥 CALLBACK DE GOOGLE RECIBIDO');
    console.log('Query params:', req.query);
    next();
  },
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/?error=auth_failed`,
    session: true,
    failureMessage: true
  }),
  (req, res) => {
    try {
      console.log('\n✅ AUTENTICACIÓN EXITOSA');
      console.log('Usuario autenticado:', req.user?.correo);
      
      const usuario = req.user;

      if (!usuario) {
        console.error('❌ No hay usuario en req.user');
        return res.redirect(`${FRONTEND_URL}/?error=no_user`);
      }

      // Generar JWT
      const token = jwt.sign(
        { usuarioId: usuario._id, correo: usuario.correo },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Preparar datos del usuario
      const usuarioData = encodeURIComponent(
        JSON.stringify({
          _id: usuario._id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          fotoPerfil: usuario.fotoPerfil,
          tipoAutenticacion: usuario.tipoAutenticacion,
        })
      );

      // Redirigir a /callback.html
      const redirectUrl = `${FRONTEND_URL}/callback.html?token=${token}&usuario=${usuarioData}`;
      
      console.log('🔀 Redirigiendo a: /callback.html');
      console.log('📦 Token incluido:', token.substring(0, 20) + '...');
      console.log('👤 Usuario incluido:', usuario.nombre);
      
      res.redirect(redirectUrl);
    } catch (err) {
      console.error('❌ ERROR EN CALLBACK:', err);
      res.redirect(`${FRONTEND_URL}/?error=callback_error`);
    }
  }
);

// Logout
app.get('/logout', (req, res) => {
  console.log('\n👋 Logout solicitado');
  req.logout((err) => {
    if (err) {
      console.error('❌ Error en logout:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    req.session.destroy((err) => {
      if (err) console.error('Error destruyendo sesión:', err);
      res.clearCookie('sessionId');
      console.log('✅ Sesión cerrada');
      res.json({ mensaje: 'Sesión cerrada exitosamente' });
    });
  });
});

// ==================== RUTAS PROTEGIDAS ====================

app.get('/perfil', verificarToken, async (req, res) => {
  try {
    console.log('\n👤 GET /perfil - Usuario:', req.usuarioId);
    
    const usuario = await Usuario.findById(req.usuarioId).select('-contrasenia');

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      mensaje: 'Datos del perfil',
      usuario,
    });
  } catch (err) {
    console.error('❌ Error en GET /perfil:', err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

app.get('/usuarios', verificarToken, async (req, res) => {
  try {
    console.log('\n📋 GET /usuarios - Usuario autenticado:', req.usuarioId);

    const usuarios = await Usuario.find().select(
      'nombre correo fotoPerfil fechaRegistro _id tipoAutenticacion'
    );

    console.log(`✅ Se encontraron ${usuarios.length} usuarios`);

    res.json({
      total: usuarios.length,
      usuarios,
    });
  } catch (err) {
    console.error('❌ Error en GET /usuarios:', err);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

app.get('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('\n🔍 GET /usuarios/:id - ID:', id);

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
    console.error('❌ Error en GET /usuarios/:id:', err);
    res.status(500).json({ error: 'Error al buscar usuario' });
  }
});

app.put('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, contrasenia } = req.body;
    console.log('\n✏️ PUT /usuarios/:id - ID:', id);

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
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
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

    console.log('✅ Usuario actualizado:', usuarioActualizado.correo);

    res.json({
      mensaje: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado,
    });
  } catch (err) {
    console.error('❌ Error en PUT /usuarios/:id:', err);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ error: mensajes });
    }

    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

app.post('/usuarios', verificarToken, async (req, res) => {
  try {
    const { nombre, correo, contrasenia } = req.body;
    console.log('\n➕ POST /usuarios - Creando usuario');

    if (!nombre || !correo || !contrasenia) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (typeof nombre !== 'string' || nombre.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof correo !== 'string' || !emailRegex.test(correo.trim())) {
      return res.status(400).json({ error: 'Correo inválido' });
    }

    if (typeof contrasenia !== 'string' || contrasenia.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const nuevoUsuario = new Usuario({
      nombre: nombre.trim(),
      correo: correo.trim().toLowerCase(),
      contrasenia,
      tipoAutenticacion: 'local',
    });

    await nuevoUsuario.save();
    console.log('✅ Usuario creado:', correo);

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        _id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
      },
    });
  } catch (err) {
    console.error('❌ Error en POST /usuarios:', err);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ error: mensajes });
    }

    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

app.delete('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('\n🗑️ DELETE /usuarios/:id - ID:', id);

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const usuarioEliminado = await Usuario.findByIdAndDelete(id);

    if (!usuarioEliminado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario eliminado:', usuarioEliminado.correo);

    res.json({
      mensaje: 'Usuario eliminado exitosamente',
      usuarioEliminado: {
        _id: usuarioEliminado._id,
        nombre: usuarioEliminado.nombre,
        correo: usuarioEliminado.correo,
      },
    });
  } catch (err) {
    console.error('❌ Error en DELETE /usuarios/:id:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// ==================== MANEJO DE ERRORES ====================

app.use((req, res) => {
  console.log('❌ 404 - Ruta no encontrada:', req.path);
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
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
- Autenticación JWT: ✅ ACTIVADA
- OAuth Google: ✅ CONFIGURADO
- MongoDB: 🔄 CONECTANDO...
- CORS: ${FRONTEND_URL}
- Modo: ${process.env.NODE_ENV || 'development'}
- Trust Proxy: ${IS_PRODUCTION ? '✅' : '❌'}
==============================================
  `);
});