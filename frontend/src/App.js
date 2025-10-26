import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000';

// Componente de Login
function LoginPage({ onNavigate }) {
  const [formData, setFormData] = useState({ correo: '', contrasenia: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      onNavigate('crud', data.usuario);
    } catch (err) {
      setError('Error al conectar con el servidor');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
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
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="contrasenia"
                value={formData.contrasenia}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                className="form-input"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
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
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="google-icon">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Iniciar con Google
        </button>

        <p className="auth-link">
          ¿No tienes cuenta? <a href="/registro">Regístrate aquí</a>
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
      const response = await fetch(`${API_URL}/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

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
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="contrasenia"
                value={formData.contrasenia}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                className="form-input"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
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

  // Definir cargarUsuarios ANTES de useEffect
  const cargarUsuarios = async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al cargar usuarios');

      const data = await response.json();
      setUsuarios(data.usuarios);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // useEffect SIN advertencias
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
      const response = await fetch(`${API_URL}/usuarios/${id}`, {
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
        ? `${API_URL}/usuarios/${usuarioEditar._id}`
        : `${API_URL}/usuarios`;

      const method = usuarioEditar ? 'PUT' : 'POST';

      // Si es edición y no cambió la contraseña, no la envía
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
          <button
            onClick={handleCrear}
            className="btn btn-success"
          >
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
                    {usuarioEditar && <span className="optional-text"> (opcional)</span>}
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.contrasenia}
                      onChange={(e) => setFormData({ ...formData, contrasenia: e.target.value })}
                      placeholder={usuarioEditar ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}
                      className="form-input"
                      required={!usuarioEditar}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
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
          <h2>Usuarios Registrados</h2>
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
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(usr => (
                    <tr key={usr._id} className="table-row">
                      <td>{usr.nombre}</td>
                      <td>{usr.correo}</td>
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

// App principal
export default function App() {
  const [page, setPage] = useState('login');
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const usuarioParam = params.get('usuario');

    if (token && usuarioParam) {
      localStorage.setItem('token', token);
      const usr = JSON.parse(decodeURIComponent(usuarioParam));
      localStorage.setItem('usuario', JSON.stringify(usr));
      setUsuario(usr);
      setPage('crud');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedToken = localStorage.getItem('token');
      const storedUsuario = localStorage.getItem('usuario');

      if (storedToken && storedUsuario) {
        setUsuario(JSON.parse(storedUsuario));
        setPage('crud');
      }
    }

    const path = window.location.pathname;
    if (path === '/registro') setPage('registro');
    else if (path === '/') setPage('login');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    setPage('login');
    window.history.pushState({}, document.title, '/');
  };

  const handleNavigate = (newPage, usr = null) => {
    setPage(newPage);
    if (usr) setUsuario(usr);
    if (newPage === 'login') window.history.pushState({}, document.title, '/');
    if (newPage === 'registro') window.history.pushState({}, document.title, '/registro');
  };

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