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
      setErrors({ general: error.message || t('common.error') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Theme & Language Controls */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <select 
          value={language} 
          onChange={(e) => changeLanguage(e.target.value)}
          className="language-select"
          style={{
            padding: '5px 10px',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            outline: 'none'
          }}
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