import React, { useState } from 'react';
import FormContainer from '../Common/FormContainer';
import Button from '../Common/Button';
import Input from '../Common/Input';
import './Login.css';

const Login = ({ onLogin, onSwitchToRegister, onThemeToggle, isDarkMode }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    }
    if (!isRecovering && !formData.password) {
      newErrors.password = 'La contraseña es requerida';
    }
    return newErrors;
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      setErrors({ username: 'Ingresa tu usuario para recuperar la contraseña' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    setRecoveryMessage('');

    try {
      const response = await fetch('/api/auth/recover-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: formData.username }),
      });

      const data = await response.json();

      if (data.success) {
        setRecoveryMessage(data.message);
      } else {
        setErrors({ general: data.message || 'Error al solicitar recuperación' });
      }
    } catch (error) {
      setErrors({ general: 'Error de conexión al servidor' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      await onLogin(formData); // Pasar las credenciales a App.js
    } catch (error) {
      setErrors({ general: error.message || 'Error al iniciar sesión' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Theme Toggle Button */}
      <button 
        className="theme-toggle-btn"
        onClick={onThemeToggle}
        title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 1000
        }}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      <FormContainer
        title={isRecovering ? "Recuperar Contraseña" : "Iniciar Sesión"}
        subtitle={isRecovering ? "Ingresa tu usuario para recibir instrucciones" : "Accede a tu nube personal"}
        maxWidth="400px"
      >
        {isRecovering ? (
          <form onSubmit={handleRecovery} className="login-form">
            {recoveryMessage ? (
              <div className="success-message" style={{ padding: '1rem', backgroundColor: 'rgba(0, 255, 0, 0.1)', borderRadius: '8px', marginBottom: '1rem', color: isDarkMode ? '#4ade80' : '#15803d' }}>
                {recoveryMessage}
                <div style={{ marginTop: '1rem' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsRecovering(false);
                      setRecoveryMessage('');
                    }}
                    fullWidth
                  >
                    Volver al Login
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {errors.general && (
                  <div className="error-message general-error">
                    {errors.general}
                  </div>
                )}

                <Input
                  type="text"
                  name="username"
                  placeholder="Nombre de usuario"
                  value={formData.username}
                  onChange={handleChange}
                  error={errors.username}
                  icon=""
                  autoComplete="username"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  loading={isLoading}
                  fullWidth
                >
                  {isLoading ? 'Enviando...' : 'Recuperar Contraseña'}
                </Button>

                <div className="form-footer">
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setIsRecovering(false);
                      setErrors({});
                    }}
                  >
                    Volver a Iniciar Sesión
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {errors.general && (
              <div className="error-message general-error">
                {errors.general}
              </div>
            )}

            <Input
              type="text"
              name="username"
              placeholder="Nombre de usuario"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              icon=""
              autoComplete="username"
            />

            <Input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon=""
              autoComplete="current-password"
            />

            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
              <button
                type="button"
                className="link-button"
                style={{ fontSize: '0.85rem' }}
                onClick={() => {
                  setIsRecovering(true);
                  setErrors({});
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="large"
              loading={isLoading}
              fullWidth
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            {onSwitchToRegister && (
              <div className="form-footer">
                <p>
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    className="link-button"
                    onClick={onSwitchToRegister}
                  >
                    Regístrate aquí
                  </button>
                </p>
              </div>
            )}
          </form>
        )}
      </FormContainer>
    </div>
  );
};export default Login;