import React, { useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    if (!formData.password) {
      newErrors.password = t('auth.password') + ' ' + t('common.error').toLowerCase();
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
      await onLogin(formData);
    } catch (error) {
      let errorMessage = t('common.error');
      
      if (error.code) {
        const errorKey = `auth.errors.${error.code}`;
        const translatedError = t(errorKey);
        
        if (translatedError !== errorKey) {
          errorMessage = translatedError;
        } else {
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
          {isDarkMode ? <FiSun /> : <FiMoon />}
        </button>
      </div>

      <FormContainer
        title={t('auth.loginTitle')}
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
      </FormContainer>
    </div>
  );
};export default Login;