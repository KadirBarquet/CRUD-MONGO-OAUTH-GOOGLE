import { mongoose } from '../db.js';
import bcrypt from 'bcryptjs';

// Esquema de Usuario
const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es requerido'],
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      trim: true,
    },
    correo: {
      type: String,
      required: [true, 'El correo es requerido'],
      unique: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Por favor ingresa un correo válido',
      ],
      trim: true,
    },
    contrasenia: {
      type: String,
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
      select: false, // No incluir por defecto
      default: null, // Opcional si autentica con Google
      trim: true,
    },
    // Campos para OAuth de Google
    googleId: {
      type: String,
      sparse: true, // Permite múltiples null
    },
    fotoPerfil: {
      type: String,
      default: null,
    },
    tipoAutenticacion: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    fechaRegistro: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// MIDDLEWARE: Hashear contraseña antes de guardar (solo si existe)
usuarioSchema.pre('save', async function (next) {
  // Si no tiene contraseña (OAuth) o no fue modificada, salta
  if (!this.isModified('contrasenia') || !this.contrasenia) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.contrasenia = await bcrypt.hash(this.contrasenia, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// MÉTODO: Comparar contraseña
usuarioSchema.methods.compararContrasenia = async function (
  contraseniaIngresada
) {
  if (!this.contrasenia) {
    return false; // No tiene contraseña (OAuth)
  }
  return await bcrypt.compare(contraseniaIngresada, this.contrasenia);
};

// Crear el modelo
const Usuario = mongoose.model('Usuario', usuarioSchema);

export default Usuario;