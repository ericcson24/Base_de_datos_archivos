import React, { useState } from 'react';
import FormContainer from './FormContainer';
import Button from './Button';
import Input from './Input';
import './Login.css';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    }
    return newErrors;
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
    <FormContainer
      title="Iniciar Sesión"
      subtitle="Accede a tu nube personal"
      maxWidth="400px"
    >
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
          icon="👤"
          autoComplete="username"
        />

        <Input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          icon="🔒"
          autoComplete="current-password"
        />

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
    </FormContainer>
  );
};

export default Login;