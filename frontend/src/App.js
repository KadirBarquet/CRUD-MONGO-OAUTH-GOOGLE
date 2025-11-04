import React, { useState, useEffect } from 'react';
import './App.css';

const apiUrl = process.env.REACT_APP_API_URL;
const googleAuthUrl = `${apiUrl}/auth/google`;

console.log('🌐 API URL configurada:', apiUrl);
console.log('🔐 Google Auth URL:', googleAuthUrl);

// Componente de Login
function LoginPage({ onNavigate }) {
  const [formData, setFormData] = useState({ correo: '', contrasenia: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Verificar si hay error en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    
    if (urlError) {
      const errorMessages = {
        'auth_failed': '❌ Error al autenticar con Google. Intenta nuevamente.',
        'no_user': '❌ No se pudo obtener la información del usuario.',
        'callback_error': '❌ Error en el proceso de autenticación.'
      };
      setError(errorMessages[urlError] || '❌ Error desconocido en la autenticación');
      
      // Limpiar la URL
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLoginLocal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('📤 Enviando login a:', `${apiUrl}/login`);
      
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('📥 Respuesta login:', data);

      if (!response.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      console.log('✅ Login exitoso, navegando al CRUD');
      onNavigate('crud', data.usuario);
    } catch (err) {
      console.error('❌ Error en login:', err);
      setError('Error al conectar con el servidor');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('🔐 Iniciando OAuth con:', googleAuthUrl);
    // Redirigir a Google OAuth
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Iniciar Sesión</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="auth-form" onSubmit={handleLoginLocal}>
          <div className="form-group">
            <label className="form-label">Correo:</label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              placeholder="tu@correo.com"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña:</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="contrasenia"
                value={formData.contrasenia}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                className="form-input"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="auth-divider">O</div>

        <button
          onClick={handleGoogleLogin}
          className="btn btn-google"
          type="button"
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="google-icon">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Iniciar con Google
        </button>

        <p className="auth-link">
          ¿No tienes cuenta? <a href="/?page=registro">Regístrate aquí</a>
        </p>
      </div>
    </div>
  );
}

// Componente de Registro
function RegistroPage({ onNavigate }) {
  const [formData, setFormData] = useState({ nombre: '', correo: '', contrasenia: '' });
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setExito('');

    try {
      console.log('📤 Enviando registro a:', `${apiUrl}/registro`);
      
      const response = await fetch(`${apiUrl}/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('📥 Respuesta registro:', data);

      if (!response.ok) {
        setError(data.error || 'Error al registrar');
        setLoading(false);
        return;
      }

      setExito('¡Registro exitoso! Redirigiendo a login...');
      setTimeout(() => {
        onNavigate('login');
      }, 2000);
    } catch (err) {
      console.error('❌ Error en registro:', err);
      setError('Error al conectar con el servidor');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Registrarse</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {exito && <div className="alert alert-success">{exito}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre:</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Tu nombre completo"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Correo:</label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              placeholder="tu@correo.com"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña:</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="contrasenia"
                value={formData.contrasenia}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                className="form-input"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya tienes cuenta? <a href="/">Inicia sesión aquí</a>
        </p>
      </div>
    </div>
  );
}

// Componente de CRUD
function CRUDPage({ usuario, onLogout }) {
  const [usuarios, setUsuarios] = useState([]);
  const [showFormulario, setShowFormulario] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', correo: '', contrasenia: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usuarioDetalle, setUsuarioDetalle] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const token = localStorage.getItem('token');

  const cargarUsuarios = async () => {
    try {
      console.log('📋 Cargando usuarios...');
      console.log('🔑 Token:', token ? 'Presente' : 'No presente');
      console.log('🌐 URL:', `${apiUrl}/usuarios`);

      const response = await fetch(`${apiUrl}/usuarios`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.error || 'Error al cargar usuarios');
      }

      const data = await response.json();
      console.log('✅ Usuarios recibidos:', data.total, 'usuarios');
      
      setUsuarios(data.usuarios);
      setLoading(false);
      setError('');
    } catch (err) {
      console.error('❌ Error en cargarUsuarios:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCrear = () => {
    setUsuarioEditar(null);
    setFormData({ nombre: '', correo: '', contrasenia: '' });
    setShowPassword(false);
    setShowFormulario(true);
  };

  const handleEditar = (usr) => {
    setUsuarioEditar(usr);
    setFormData({ nombre: usr.nombre, correo: usr.correo, contrasenia: '' });
    setShowPassword(false);
    setShowFormulario(true);
  };

  const handleDetalle = (usr) => {
    setUsuarioDetalle(usr);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      const response = await fetch(`${apiUrl}/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al eliminar');

      setUsuarios(usuarios.filter(u => u._id !== id));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = usuarioEditar
        ? `${apiUrl}/usuarios/${usuarioEditar._id}`
        : `${apiUrl}/usuarios`;

      const method = usuarioEditar ? 'PUT' : 'POST';

      const dataEnviar = usuarioEditar && !formData.contrasenia
        ? { nombre: formData.nombre, correo: formData.correo }
        : { nombre: formData.nombre, correo: formData.correo, contrasenia: formData.contrasenia };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataEnviar)
      });

      if (!response.ok) throw new Error('Error en la operación');

      cargarUsuarios();
      setShowFormulario(false);
      setFormData({ nombre: '', correo: '', contrasenia: '' });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1 className="header-title">Dashboard</h1>
        <div className="user-info">
          {usuario.fotoPerfil && (
            <img
              src={usuario.fotoPerfil}
              alt="Avatar"
              className="avatar"
            />
          )}
          <span>{usuario.nombre}</span>
          <button onClick={onLogout} className="btn btn-logout">Cerrar Sesión</button>
        </div>
      </div>

      <div className="dashboard-content">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="action-bar">
          <button onClick={handleCrear} className="btn btn-success">
            + Crear Usuario
          </button>
        </div>

        {showFormulario && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>{usuarioEditar ? 'Editar Usuario' : 'Crear Usuario'}</h3>
              <form className="modal-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombre:</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo:</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Contraseña:
                    {usuarioEditar && <span style={{ fontSize: '12px', color: '#999' }}> (opcional)</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.contrasenia}
                      onChange={(e) => setFormData({ ...formData, contrasenia: e.target.value })}
                      placeholder={usuarioEditar ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}
                      className="form-input"
                      required={!usuarioEditar}
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px'
                      }}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>
                <div className="modal-buttons">
                  <button type="submit" className="btn btn-primary">
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFormulario(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {usuarioDetalle && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Detalles del Usuario</h3>
              <div className="detalle-info">
                <p><strong>Nombre:</strong> {usuarioDetalle.nombre}</p>
                <p><strong>Correo:</strong> {usuarioDetalle.correo}</p>
                <p><strong>Tipo:</strong> {usuarioDetalle.tipoAutenticacion === 'google' ? 'Google OAuth' : 'Local'}</p>
                <p><strong>Fecha Registro:</strong> {new Date(usuarioDetalle.fechaRegistro).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setUsuarioDetalle(null)}
                className="btn btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        <div className="table-container">
          <h2>Usuarios Registrados ({usuarios.length})</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : usuarios.length === 0 ? (
            <p>No hay usuarios registrados</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr className="table-header">
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Tipo</th>
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(usr => (
                    <tr key={usr._id} className="table-row">
                      <td>
                        {usr.fotoPerfil && (
                          <img 
                            src={usr.fotoPerfil} 
                            alt={usr.nombre}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              marginRight: '8px',
                              verticalAlign: 'middle'
                            }}
                          />
                        )}
                        {usr.nombre}
                      </td>
                      <td>{usr.correo}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: usr.tipoAutenticacion === 'google' ? '#e3f2fd' : '#f3e5f5',
                          color: usr.tipoAutenticacion === 'google' ? '#1976d2' : '#7b1fa2'
                        }}>
                          {usr.tipoAutenticacion === 'google' ? '🔐 Google' : '📧 Local'}
                        </span>
                      </td>
                      <td>{new Date(usr.fechaRegistro).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleDetalle(usr)}
                          className="btn btn-sm btn-info"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => handleEditar(usr)}
                          className="btn btn-sm btn-primary"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(usr._id)}
                          className="btn btn-sm btn-danger"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// App principal - VERSIÓN CORREGIDA
export default function App() {
  const [page, setPage] = useState('loading');
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    console.log('==============================================');
    console.log('🚀 APP INICIADA - Verificando autenticación');
    console.log('==============================================');
    
    // Función para procesar autenticación
    const procesarAutenticacion = () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const usuarioParam = params.get('usuario');
      const pageParam = params.get('page');
      const errorParam = params.get('error');

      console.log('📦 URL completa:', window.location.href);
      console.log('📦 Parámetros detectados:');
      console.log('  - token:', token ? '✅ Presente (' + token.substring(0, 20) + '...)' : '❌ No presente');
      console.log('  - usuario:', usuarioParam ? '✅ Presente' : '❌ No presente');
      console.log('  - page:', pageParam || 'No especificado');
      console.log('  - error:', errorParam || 'No hay error');

      // CASO 1: Callback de Google OAuth
      if (token && usuarioParam) {
        try {
          console.log('\n🔐 PROCESANDO CALLBACK DE GOOGLE OAUTH');
          console.log('---------------------------------------------');
          
          // Guardar token
          localStorage.setItem('token', token);
          console.log('✅ Token guardado en localStorage');
          
          // Decodificar y guardar usuario
          console.log('📝 Decodificando usuario...');
          console.log('Raw usuario param:', usuarioParam.substring(0, 100) + '...');
          
          const usr = JSON.parse(decodeURIComponent(usuarioParam));
          localStorage.setItem('usuario', JSON.stringify(usr));
          console.log('✅ Usuario decodificado y guardado:', usr.nombre, '(' + usr.correo + ')');
          console.log('✅ Tipo de autenticación:', usr.tipoAutenticacion);
          console.log('✅ ID del usuario:', usr._id);
          
          // Establecer estado
          setUsuario(usr);
          setPage('crud');
          
          // Limpiar URL
          console.log('🧹 Limpiando URL...');
          window.history.replaceState({}, document.title, '/');
          console.log('✅ URL limpiada');
          
          console.log('\n✅ AUTENTICACIÓN OAUTH EXITOSA');
          console.log('   Mostrando CRUD...');
          console.log('---------------------------------------------\n');
          
          return true; // Autenticación exitosa
        } catch (err) {
          console.error('\n❌ ERROR AL PROCESAR CALLBACK OAUTH:', err);
          console.error('---------------------------------------------');
          console.error('Nombre del error:', err.name);
          console.error('Mensaje:', err.message);
          console.error('Stack:', err.stack);
          
          // Intentar guardar aunque sea el token
          if (token) {
            console.log('⚠️ Intentando guardar solo el token...');
            localStorage.setItem('token', token);
          }
          
          localStorage.removeItem('usuario'); // Limpiar usuario corrupto
          setPage('login');
          window.history.replaceState({}, document.title, '/?error=parse_error');
          return false;
        }
      }

      // CASO 2: Error en autenticación
      if (errorParam) {
        console.log('\n❌ ERROR EN AUTENTICACIÓN:', errorParam);
        setPage('login');
        return false;
      }

      // CASO 3: Ya tiene sesión guardada
      const storedToken = localStorage.getItem('token');
      const storedUsuario = localStorage.getItem('usuario');

      console.log('\n🔍 Verificando sesión guardada:');
      console.log('  - Token en localStorage:', storedToken ? '✅ Presente' : '❌ No presente');
      console.log('  - Usuario en localStorage:', storedUsuario ? '✅ Presente' : '❌ No presente');

      if (storedToken && storedUsuario) {
        try {
          const usr = JSON.parse(storedUsuario);
          setUsuario(usr);
          setPage('crud');
          console.log('✅ Sesión recuperada exitosamente:', usr.nombre);
          console.log('   Mostrando CRUD...\n');
          return true;
        } catch (err) {
          console.error('❌ Error al parsear usuario guardado:', err);
          localStorage.clear();
        }
      }

      // CASO 4: Navegación manual (registro o login)
      console.log('\n🔄 No hay sesión activa');
      if (pageParam === 'registro') {
        console.log('   Mostrando página de REGISTRO\n');
        setPage('registro');
      } else {
        console.log('   Mostrando página de LOGIN\n');
        setPage('login');
      }
      console.log('==============================================\n');
      
      return false;
    };

    // Ejecutar procesamiento
    procesarAutenticacion();
  }, []); // Solo ejecutar una vez al montar

  const handleLogout = () => {
    console.log('\n👋 CERRANDO SESIÓN');
    console.log('---------------------------------------------');
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    console.log('✅ Token eliminado');
    console.log('✅ Usuario eliminado');
    setUsuario(null);
    setPage('login');
    window.history.pushState({}, document.title, '/');
    console.log('✅ Sesión cerrada correctamente');
    console.log('---------------------------------------------\n');
  };

  const handleNavigate = (newPage, usr = null) => {
    console.log('\n🔄 NAVEGACIÓN');
    console.log('---------------------------------------------');
    console.log('Navegando a:', newPage);
    setPage(newPage);
    
    if (usr) {
      setUsuario(usr);
      console.log('✅ Usuario establecido:', usr.nombre);
    }
    
    if (newPage === 'login') {
      window.history.pushState({}, document.title, '/');
    } else if (newPage === 'registro') {
      window.history.pushState({}, document.title, '/?page=registro');
    }
    console.log('---------------------------------------------\n');
  };

  // Mostrar loading mientras se verifica la autenticación
  if (page === 'loading') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Cargando...</h2>
          <p style={{ textAlign: 'center', color: '#666' }}>Verificando autenticación</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {page === 'login' && <LoginPage onNavigate={handleNavigate} />}
      {page === 'registro' && <RegistroPage onNavigate={handleNavigate} />}
      {page === 'crud' && usuario && (
        <CRUDPage usuario={usuario} onLogout={handleLogout} />
      )}
    </div>
  );
}