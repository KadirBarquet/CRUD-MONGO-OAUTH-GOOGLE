import jwt from 'jsonwebtoken';

// Middleware para verificar JWT 
export const verificarToken = (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Token no proporcionado. Usa: Authorization: Bearer <token>',
            });
        }

        // Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuarioId = decoded.usuarioId; // Guardar el ID del usuario en la request
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        res.status(500).json({ error: 'Error al verificar token' });
    }
};

