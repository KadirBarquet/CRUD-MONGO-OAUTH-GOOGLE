// Middleware para verificar si usuario está autenticado via Passport
export const estaAutenticado = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'No autenticado. Por favor, inicia sesión con Google' });
};

// Middleware para generar JWT después de autenticar con Google
export const generarJWTDesdeGoogle = (req, res, next) => {
  if (req.user) {
    // El usuario está autenticado, proceder
    next();
  } else {
    res.status(401).json({ error: 'Usuario no autenticado' });
  }
};