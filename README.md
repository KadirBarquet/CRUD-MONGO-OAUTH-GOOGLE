# CRUD Full-Stack con Autenticación JWT y OAuth Google

Sistema completo de gestión de usuarios con autenticación local (JWT) y Google OAuth, construido con React, Express, MongoDB y desplegado en Vercel y Render.

---

## Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#️-tecnologías)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#️-configuración)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Despliegue](#-despliegue)
- [Solución de Problemas](#-solución-de-problemas)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## Características

### Autenticación
- **Registro e inicio de sesión local** con JWT
- **OAuth 2.0 con Google** para autenticación social
- **Contraseñas hasheadas** con bcryptjs (10 salt rounds)
- **Tokens JWT** con expiración de 7 días
- **Sesiones seguras** con express-session para OAuth

### Gestión de Usuarios (CRUD)
- **Crear** usuarios con validación de datos
- **Leer** lista completa de usuarios
- **Actualizar** información de usuarios
- **Eliminar** usuarios con confirmación
- **Ver detalles** completos de cada usuario

### Interfaz de Usuario
- **UI moderna** con animaciones CSS
- **Diseño responsive** (mobile-first)
- **Visualización de avatares** (Google OAuth)
- **Indicadores visuales** de tipo de autenticación
- **Feedback en tiempo real** (loading, errores)

### Seguridad
- **CORS configurado** para producción
- **Middleware de autenticación** en rutas protegidas
- **Validación de datos** en frontend y backend
- **Variables de entorno** para credenciales sensibles

---

## Tecnologías

### Frontend
- **React 19.1.1** - Librería UI
- **CSS3** - Estilos personalizados con animaciones
- **Fetch API** - Cliente HTTP
- **LocalStorage** - Persistencia de sesión
- **Vercel** - Hosting y despliegue

### Backend
- **Node.js** - Runtime de JavaScript
- **Express 4.18.2** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose 7.0.0** - ODM para MongoDB
- **Passport.js** - Autenticación con estrategias
- **JWT (jsonwebtoken)** - Tokens de autenticación
- **bcryptjs** - Hash de contraseñas
- **Render** - Hosting y despliegue

### Servicios Externos
- **MongoDB Atlas** - Base de datos en la nube
- **Google Cloud Console** - OAuth 2.0 credentials

---

## Arquitectura

```
┌─────────────────┐      HTTPS      ┌──────────────────┐
│   React App     │ ◄──────────────► │  Express Server  │
│   (Vercel)      │                  │    (Render)      │
└─────────────────┘                  └──────────────────┘
        │                                      │
        │                                      │
        ▼                                      ▼
┌─────────────────┐                  ┌──────────────────┐
│  LocalStorage   │                  │  MongoDB Atlas   │
│  (Token + User) │                  │   (Database)     │
└─────────────────┘                  └──────────────────┘
        │
        │
        ▼
┌─────────────────┐
│  Google OAuth   │
│   (Accounts)    │
└─────────────────┘
```

### Flujo de Autenticación Local

```
1. Usuario → Formulario Login
2. Frontend → POST /login (correo, contraseña)
3. Backend → Verificar credenciales en MongoDB
4. Backend → Generar JWT
5. Backend → Respuesta {token, usuario}
6. Frontend → Guardar en localStorage
7. Frontend → Redirigir a CRUD
```

### Flujo de OAuth Google

```
1. Usuario → Click "Iniciar con Google"
2. Frontend → Redirect a /auth/google
3. Backend → Redirect a Google OAuth
4. Google → Usuario selecciona cuenta
5. Google → Callback a /auth/google/callback
6. Backend → Crear/buscar usuario en MongoDB
7. Backend → Generar JWT
8. Backend → Redirect a /callback.html?token=...&usuario=...
9. Frontend (callback.html) → Guardar en localStorage
10. Frontend → Redirect a /
11. React App → Leer localStorage y mostrar CRUD
```

---

## Requisitos Previos

- **Node.js** >= 16.x
- **npm** >= 8.x
- **MongoDB Atlas** cuenta activa
- **Google Cloud Console** proyecto configurado
- **Git** para control de versiones

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/KadirBarquet/CRUD-MONGO-OAUTH-GOOGLE.git
cd crud-mongo-oauth-google
```

### 2. Instalar dependencias

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

---

## Configuración

### Backend (.env)

Crea un archivo `.env` en la carpeta `backend/`:

```env
# URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/nombre-bd?retryWrites=true&w=majority
DB_NAME=registro-usuarios

# JWT
JWT_SECRET=tu_clave_super_secreta_aqui_cambiar_en_produccion

# Session
SESSION_SECRET=tu_session_secret_seguro_cambiar_en_produccion

# Google OAuth
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret

# Entorno
NODE_ENV=development
PORT=5000
```

### Frontend (.env)

Crea un archivo `.env` en la carpeta `frontend/`:

```env
REACT_APP_API_URL=http://localhost:5000
```

### Configurar Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Google+ API**
4. Ve a **Credenciales** → **Crear credenciales** → **ID de cliente OAuth 2.0**
5. Configura las URIs:

**Orígenes autorizados de JavaScript:**
```
http://localhost:3000
https://tu-frontend.vercel.app
https://tu-backend.onrender.com
```

**URIs de redireccionamiento autorizados:**
```
http://localhost:5000/auth/google/callback
https://tu-backend.onrender.com/auth/google/callback
```

6. Copia el **Client ID** y **Client Secret** al `.env`

### Configurar MongoDB Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un cluster gratuito (M0)
3. Crea un usuario de base de datos
4. Agrega tu IP a la lista blanca (o 0.0.0.0/0 para acceso completo)
5. Obtén la **Connection String** y agrégala al `.env`

---

## Uso

### Modo Desarrollo

#### Backend
```bash
cd backend
npm run dev
```
Servidor corriendo en: http://localhost:5000

#### Frontend
```bash
cd frontend
npm start
```
Aplicación corriendo en: http://localhost:3000

### Probar la Aplicación

1. **Registro Local**:
   - Ir a http://localhost:3000
   - Click en "Regístrate aquí"
   - Completar formulario (nombre, correo, contraseña)
   - Automáticamente redirige al login

2. **Login Local**:
   - Ingresar correo y contraseña
   - Click en "Iniciar Sesión"

3. **Login con Google**:
   - Click en "Iniciar con Google"
   - Seleccionar cuenta de Google
   - Automáticamente crea cuenta y redirige al CRUD

4. **Gestionar Usuarios** (requiere estar autenticado):
   - Ver lista de usuarios
   - Crear nuevo usuario
   - Editar usuario existente
   - Ver detalles completos
   - Eliminar usuario

---

## Estructura del Proyecto

```
crud-mongo-oauth-google/
│
├── backend/
│   ├── config/
│   │   └── passport.js          # Configuración de Passport.js y Google OAuth
│   ├── middleware/
│   │   ├── auth.js               # Middleware de verificación JWT
│   │   └── authGoogle.js         # Middleware de autenticación Google
│   ├── models/
│   │   └── Usuario.js            # Modelo de Usuario (Mongoose)
│   ├── .env                      # Variables de entorno (NO SUBIR A GIT)
│   ├── .gitignore                # Archivos ignorados por Git
│   ├── db.js                     # Conexión a MongoDB
│   ├── package.json              # Dependencias del backend
│   └── server.js                 # Servidor Express principal
│
├── frontend/
│   ├── public/
│   │   ├── callback.html         # Página de callback para OAuth
│   │   ├── favicon.ico
│   │   └── index.html
│   ├── src/
│   │   ├── App.css               # Estilos principales
│   │   ├── App.js                # Componente principal de React
│   │   └── index.js              # Punto de entrada de React
│   ├── .env                      # Variables de entorno (NO SUBIR A GIT)
│   ├── .gitignore                # Archivos ignorados por Git
│   ├── package.json              # Dependencias del frontend
│   └── vercel.json               # Configuración de Vercel
│
└── README.md                     # Este archivo
```

---

## API Endpoints

### Autenticación

#### POST `/registro`
Registrar nuevo usuario con autenticación local.

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "correo": "juan@example.com",
  "contrasenia": "password123"
}
```

**Respuesta exitosa (201):**
```json
{
  "mensaje": "Usuario registrado exitosamente",
  "usuario": {
    "_id": "64abc123...",
    "nombre": "Juan Pérez",
    "correo": "juan@example.com"
  }
}
```

#### POST `/login`
Iniciar sesión con credenciales locales.

**Body:**
```json
{
  "correo": "juan@example.com",
  "contrasenia": "password123"
}
```

**Respuesta exitosa (200):**
```json
{
  "mensaje": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "_id": "64abc123...",
    "nombre": "Juan Pérez",
    "correo": "juan@example.com",
    "fotoPerfil": null,
    "tipoAutenticacion": "local"
  }
}
```

#### GET `/auth/google`
Iniciar flujo de autenticación con Google OAuth.

**Respuesta:** Redirect a Google OAuth

#### GET `/auth/google/callback`
Callback de Google después de autenticación exitosa.

**Respuesta:** Redirect a `/callback.html?token=...&usuario=...`

#### GET `/logout`
Cerrar sesión (solo para sesiones de OAuth).

**Respuesta exitosa (200):**
```json
{
  "mensaje": "Sesión cerrada exitosamente"
}
```

### Usuarios (Rutas protegidas - requieren JWT)

#### GET `/usuarios`
Obtener lista de todos los usuarios.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "total": 5,
  "usuarios": [
    {
      "_id": "64abc123...",
      "nombre": "Juan Pérez",
      "correo": "juan@example.com",
      "fotoPerfil": null,
      "tipoAutenticacion": "local",
      "fechaRegistro": "2024-01-15T10:30:00.000Z"
    },
    ...
  ]
}
```

#### GET `/usuarios/:id`
Obtener detalles de un usuario específico.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "mensaje": "Usuario encontrado",
  "usuario": {
    "_id": "64abc123...",
    "nombre": "Juan Pérez",
    "correo": "juan@example.com",
    "fotoPerfil": null,
    "tipoAutenticacion": "local",
    "fechaRegistro": "2024-01-15T10:30:00.000Z"
  }
}
```

#### POST `/usuarios`
Crear nuevo usuario (como administrador).

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "nombre": "María García",
  "correo": "maria@example.com",
  "contrasenia": "password456"
}
```

**Respuesta exitosa (201):**
```json
{
  "mensaje": "Usuario creado exitosamente",
  "usuario": {
    "_id": "64def456...",
    "nombre": "María García",
    "correo": "maria@example.com"
  }
}
```

#### PUT `/usuarios/:id`
Actualizar información de usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Body (todos los campos opcionales):**
```json
{
  "nombre": "Juan Carlos Pérez",
  "correo": "juancarlos@example.com",
  "contrasenia": "newpassword789"
}
```

**Respuesta exitosa (200):**
```json
{
  "mensaje": "Usuario actualizado exitosamente",
  "usuario": {
    "_id": "64abc123...",
    "nombre": "Juan Carlos Pérez",
    "correo": "juancarlos@example.com",
    ...
  }
}
```

#### DELETE `/usuarios/:id`
Eliminar un usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "mensaje": "Usuario eliminado exitosamente",
  "usuarioEliminado": {
    "_id": "64abc123...",
    "nombre": "Juan Pérez",
    "correo": "juan@example.com"
  }
}
```

#### GET `/perfil`
Obtener perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "mensaje": "Datos del perfil",
  "usuario": {
    "_id": "64abc123...",
    "nombre": "Juan Pérez",
    "correo": "juan@example.com",
    "fotoPerfil": null,
    "tipoAutenticacion": "local",
    "fechaRegistro": "2024-01-15T10:30:00.000Z"
  }
}
```

### Health Check

#### GET `/`
Verificar estado del servidor.

**Respuesta exitosa (200):**
```json
{
  "mensaje": "Servidor Express funcionando correctamente",
  "estado": "Backend listo para MongoDB + JWT + OAuth",
  "timestamp": "2024-11-04T12:00:00.000Z",
  "frontend": "https://tu-frontend.vercel.app",
  "backend": "https://tu-backend.onrender.com",
  "environment": "production",
  "session": {
    "hasSession": false,
    "isAuthenticated": false
  }
}
```

#### GET `/health`
Health check simple.

**Respuesta exitosa (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-11-04T12:00:00.000Z",
  "uptime": 12345.67
}
```

---

## Despliegue

### Backend en Render

1. **Crear cuenta en [Render](https://render.com)**

2. **Conectar repositorio de GitHub**

3. **Crear nuevo Web Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

4. **Configurar variables de entorno** en Render Dashboard:
```
BACKEND_URL=https://tu-app.onrender.com
FRONTEND_URL=https://tu-app.vercel.app
MONGODB_URI=mongodb+srv://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
SESSION_SECRET=...
NODE_ENV=production
```

5. **NO agregar** la variable `PORT` (Render la asigna automáticamente)

6. **Deploy automático** se ejecutará en cada push a main/master

### Frontend en Vercel

1. **Crear cuenta en [Vercel](https://vercel.com)**

2. **Importar proyecto de GitHub**

3. **Configurar proyecto**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Create React App`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

4. **Agregar variable de entorno**:
```
REACT_APP_API_URL=https://tu-app.onrender.com
```

5. **Deploy** - Automático en cada push

### Actualizar URLs en Google Cloud Console

Después del deploy, actualiza las URIs en Google Cloud Console:

**Orígenes autorizados:**
```
https://tu-backend.onrender.com
https://tu-frontend.vercel.app
```

**URIs de redireccionamiento:**
```
https://tu-backend.onrender.com/auth/google/callback
```

---

## Solución de Problemas

### OAuth no funciona en producción

**Síntoma**: Al hacer click en "Iniciar con Google", redirige al login sin autenticar.

**Soluciones**:
1. Verificar que las URIs en Google Cloud Console coincidan **exactamente** con las URLs de producción
2. Esperar 5-10 minutos después de cambiar URIs (Google tarda en propagar cambios)
3. Verificar que `FRONTEND_URL` y `BACKEND_URL` en `.env` sean correctas
4. Revisar logs en Render para ver errores del backend
5. Verificar que `callback.html` esté en `frontend/public/`

### Error: "Cannot connect to MongoDB"

**Soluciones**:
1. Verificar que `MONGODB_URI` sea correcta
2. Whitelist de IP en MongoDB Atlas (agregar `0.0.0.0/0` para permitir todas)
3. Verificar usuario y contraseña de MongoDB
4. Asegurar que el cluster esté activo

### Error: "CORS policy blocked"

**Soluciones**:
1. Verificar que `FRONTEND_URL` en backend sea correcta
2. Asegurar que Render tenga la variable `FRONTEND_URL` configurada
3. Verificar que `REACT_APP_API_URL` en frontend apunte al backend correcto

### Token JWT expirado

**Síntoma**: Error 401 al hacer peticiones.

**Solución**: Cerrar sesión y volver a autenticarse. Los tokens expiran después de 7 días.

### Backend en Render tarda en responder

**Solución**: Render Free Tier duerme el servicio después de 15 minutos de inactividad. La primera petición después de dormir tarda ~30 segundos. Considera upgradear a un plan pago para instancias siempre activas.

### Vercel no muestra cambios

**Soluciones**:
1. Hacer hard refresh: `Ctrl + Shift + R` (Windows/Linux) o `Cmd + Shift + R` (Mac)
2. Limpiar cache del navegador
3. Verificar que el deploy en Vercel haya completado exitosamente
4. Revisar logs de deploy en Vercel Dashboard

---

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## Autor

**Tu Nombre**
- GitHub: [KadirBarquet](https://github.com/KadirBarquet)
- Email: kbarquetb@unemi.edu.ec

---

## Agradecimientos

- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Passport.js](http://www.passportjs.org/)
- [Vercel](https://vercel.com/)
- [Render](https://render.com/)
- [Google Cloud Platform](https://cloud.google.com/)

---

## Estado del Proyecto

- ✅ Autenticación local (JWT)
- ✅ OAuth con Google
- ✅ CRUD completo de usuarios
- ✅ Despliegue en producción
- ✅ UI responsive
- ⏳ Roles de usuario (pendiente)
- ⏳ Recuperación de contraseña (pendiente)
- ⏳ Refresh tokens (pendiente)

---

**⭐ Si este proyecto te fue útil, considera darle una estrella en GitHub ⭐**