import React, { useState } from 'react';
import FormContainer from '../Common/FormContainer';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { useLanguage } from '../../context/LanguageContext';
import './Login.css';

const Login = ({ onLogin, onSwitchToRegister, onThemeToggle, isDarkMode }) => {
  const { t, language, changeLanguage } = useLanguage();
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
      newErrors.username = t('auth.username') + ' ' + t('common.error').toLowerCase();
    }
    if (!isRecovering && !formData.password) {
      newErrors.password = t('auth.password') + ' ' + t('common.error').toLowerCase();
    }
    return newErrors;
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      setErrors({ username: t('auth.recoveryInstruction') });
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
        setErrors({ general: data.message || t('common.error') });
      }
    } catch (error) {
      setErrors({ general: t('common.error') });
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
      // Usar traducción si hay código de error, sino usar mensaje del servidor o genérico
      let errorMessage = t('common.error');
      
      if (error.code) {
        // Mapear códigos de error a claves de traducción
        const errorKey = `auth.errors.${error.code}`;
        const translatedError = t(errorKey);
        
        // Si la traducción existe (no devuelve la clave), usarla
        if (translatedError !== errorKey) {
          errorMessage = translatedError;
        } else {
           // Fallback para códigos no traducidos
           errorMessage = error.message;
        }
      } else {
        errorMessage = error.message || t('common.error');
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Theme & Language Controls */}
      <div className="login-controls">
        <select 
          value={language} 
          onChange={(e) => changeLanguage(e.target.value)}
          className="language-select"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pl">Polski</option>
        </select>

        <button 
          className="theme-toggle-btn"
          onClick={onThemeToggle}
          title={isDarkMode ? t('common.theme.light') : t('common.theme.dark')}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <FormContainer
        title={isRecovering ? t('auth.recover') : t('auth.loginTitle')}
        subtitle={isRecovering ? t('auth.recoveryInstruction') : "Accede a tu nube personal"}
        maxWidth="400px"
      >
        {isRecovering ? (
          <form onSubmit={handleRecovery} className="login-form">
            {recoveryMessage ? (
              <div className="success-message">
                {recoveryMessage}
                <div className="success-message-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsRecovering(false);
                      setRecoveryMessage('');
                    }}
                    fullWidth
                  >
                    {t('auth.backToLogin')}
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
                  placeholder={t('auth.username')}
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
                  {isLoading ? t('auth.sending') : t('auth.sendRecovery')}
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
                    {t('auth.backToLogin')}
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
              placeholder={t('auth.username')}
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              icon=""
              autoComplete="username"
            />

            <Input
              type="password"
              name="password"
              placeholder={t('auth.password')}
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon=""
              autoComplete="current-password"
            />

            <div className="forgot-password-container">
              <button
                type="button"
                className="link-button forgot-password-btn"
                onClick={() => {
                  setIsRecovering(true);
                  setErrors({});
                }}
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="large"
              loading={isLoading}
              fullWidth
            >
              {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
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