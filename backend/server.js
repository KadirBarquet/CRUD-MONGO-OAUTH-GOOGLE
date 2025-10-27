import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import passport from 'passport';
import './config/passport.js'; // Importar configuración de Passport
import conectarMongoDB from './db.js';
import Usuario from './models/Usuario.js';
import { verificarToken } from './middleware/auth.js';
import { estaAutenticado } from './middleware/authGoogle.js';

dotenv.config(); // Cargar variables de entorno

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true, // Importante para enviar cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Si estamos en producción detrás de un proxy (Heroku/Render), confiar en el proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Configurar express-session
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu_session_secret_seguro',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // true solo en producción con HTTPS
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    sameSite: 'lax', // Importante para OAuth
  },
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Conectar a MongoDB
conectarMongoDB();

// ==================== RUTAS PÚBLICAS ====================

// GET / - Raíz
app.get('/', (req, res) => {
  res.json({
    mensaje: 'Servidor Express funcionando!',
    estado: 'Backend listo para MongoDB + JWT + OAuth',
  });
});

// ==================== AUTENTICACIÓN LOCAL ====================

// POST /registro - Registrar nuevo usuario
app.post('/registro', async (req, res) => {
  try {
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
      return res
        .status(400)
        .json({ error: 'El correo ya está registrado' });
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

// POST /login - Autenticar usuario y devolver JWT
app.post('/login', async (req, res) => {
  try {
    const { correo, contrasenia } = req.body;

    if (!correo || !contrasenia) {
      return res
        .status(400)
        .json({ error: 'Correo y contraseña son requeridos' });
    }

    const usuario = await Usuario.findOne({ correo }).select('+contrasenia');

    if (!usuario) {
      return res.status(401).json({
        error: 'Correo o contraseña incorrectos',
      });
    }

    const esValida = await usuario.compararContrasenia(contrasenia);

    if (!esValida) {
      return res.status(401).json({
        error: 'Correo o contraseña incorrectos',
      });
    }

    const token = jwt.sign(
      {
        usuarioId: usuario._id,
        correo: usuario.correo,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

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

// GET /auth/google - Iniciar autenticación con Google
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// GET /auth/google/callback - Callback de Google
app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${FRONTEND_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    // Usuario autenticado exitosamente
    const usuario = req.user;

    // Generar JWT
    const token = jwt.sign(
      {
        usuarioId: usuario._id,
        correo: usuario.correo,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirigir al frontend React con el token en query params
    const usuarioData = encodeURIComponent(
      JSON.stringify({
        _id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        fotoPerfil: usuario.fotoPerfil,
      })
    );

    res.redirect(
      `${FRONTEND_URL}/dashboard?token=${token}&usuario=${usuarioData}`
    );
  }
);

// GET /logout - Cerrar sesión
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
  });
});

// ==================== RUTAS PROTEGIDAS ====================

// GET /perfil - Obtener perfil del usuario autenticado
app.get('/perfil', verificarToken, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId).select(
      '-contrasenia'
    );

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

// GET /usuarios - Listar todos (PROTEGIDO)
app.get('/usuarios', verificarToken, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select(
      'nombre correo fotoPerfil fechaRegistro _id'
    );

    res.json({
      total: usuarios.length,
      usuarios,
    });
  } catch (err) {
    console.error('Error en GET /usuarios:', err.message);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

// GET /usuarios/:id - Obtener usuario por ID (PROTEGIDO)
app.get('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

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

// PUT /usuarios/:id - Actualizar usuario (PROTEGIDO)
app.put('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, contrasenia } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (nombre && typeof nombre !== 'string') {
      return res.status(400).json({ error: 'El nombre debe ser texto' });
    }

    if (correo && typeof correo !== 'string') {
      return res.status(400).json({ error: 'El correo debe ser texto' });
    }

    // Validar contraseña si se proporciona
    if (contrasenia && typeof contrasenia !== 'string') {
      return res.status(400).json({ error: 'La contraseña debe ser texto' });
    }

    if (contrasenia && contrasenia.length < 8) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    // Preparar datos a actualizar
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

    res.json({
      mensaje: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado,
    });
  } catch (err) {
    console.error('Error en PUT /usuarios/:id:', err.message);

    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: 'El correo ya está registrado' });
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

// POST /usuarios - Crear nuevo usuario (PROTEGIDO)
app.post('/usuarios', verificarToken, async (req, res) => {
  try {
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
      return res
        .status(400)
        .json({ error: 'El correo ya está registrado' });
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

// DELETE /usuarios/:id - Eliminar usuario (PROTEGIDO)
app.delete('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const usuarioEliminado = await Usuario.findByIdAndDelete(id);

    if (!usuarioEliminado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

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
Servidor corriendo en http://localhost:${PORT}
==============================================
Autenticación JWT activada
OAuth Google configurado
Backend listo con MongoDB + Seguridad
==============================================
  `);
});