import React, { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import UserPanel from './components/UserPanel/UserPanel';
import AdminPanel from './components/Admin/AdminPanel';
import FolderSelector from './components/UserPanel/FolderSelector';
import Calendar from './components/Calendar/Calendar';
import './App.css';

// Utility functions for cookie management
const setCookie = (name, value, days = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // 'login', 'folders', 'panel', 'calendar', 'admin'
  const [isLoading, setIsLoading] = useState(true);

  // Estado para el tema global - ahora usa cookies
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Cargar preferencia de las cookies
    const saved = getCookie('theme');
    return saved === 'dark';
  });

  // Aplicar tema cuando cambia
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
      setCookie('theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      setCookie('theme', 'light');
    }
  }, [isDarkMode]);

  // Función para toggle del tema
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Verificar si hay token guardado al cargar la app
  useEffect(() => {
    const checkStoredToken = async () => {
      const storedToken = localStorage.getItem('auth_token');
      
      try {
        // Verificar si el token es válido haciendo una petición (usa cookie o header)
        const headers = {};
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch('/api/auth/verify', {
          headers,
          credentials: 'include' // Importante para enviar cookies
        });

        if (response.ok) {
          const data = await response.json();
          // Si el servidor devuelve usuario pero no token (porque usó cookie),
          // usamos el storedToken si existe, o null si no.
          // Nota: Si queremos restaurar el token en localStorage desde la cookie,
          // el endpoint /verify debería devolver el token también.
          const userWithToken = {
            ...data.user,
            token: storedToken || data.token // data.token podría venir si el backend lo añade
          };
          
          setUser(userWithToken);
          setIsLoggedIn(true);
          
          // Si el backend nos devolvió un token nuevo o recuperado, guardarlo
          if (data.token) {
            localStorage.setItem('auth_token', data.token);
          }
          
          // Detectar ruta actual y cambiar currentView
          const currentPath = window.location.pathname;
          if (currentPath === '/calendar') {
            setCurrentView('calendar');
          } else if (currentPath === '/panel') {
            setCurrentView('panel');
          } else if (currentPath === '/admin') {
            setCurrentView('admin');
          } else if (currentPath === '/folders') {
            setCurrentView('folders');
          } else {
            // Redirigir según el rol del usuario si está autenticado
            if (userWithToken.role === 'admin') {
              setCurrentView('admin');
              window.history.pushState(null, '', '/admin');
            } else {
              setCurrentView('folders');
              window.history.pushState(null, '', '/folders');
            }
          }
        } else {
          // Token inválido o no hay sesión
          localStorage.removeItem('auth_token');
          if (!window.location.search.includes('redirect=calendar')) {
             setCurrentView('login');
          }
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        localStorage.removeItem('auth_token');
        setCurrentView('login');
      }

      // Verificar si hay parámetro redirect=calendar en la URL
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');

      // Variable para saber si la autenticación fue exitosa (ya que el estado isLoggedIn no se actualiza inmediatamente)
      // Podemos inferirlo si setUser fue llamado, pero mejor usar una variable local si pudiéramos.
      // Como no tenemos variable local accesible fuera del try, verificamos si localStorage tiene token (si fue exitoso lo guardamos/mantuvimos)
      // O mejor, movemos esta lógica dentro del flujo.
      
      if (redirect === 'calendar') {
        const tokenExists = localStorage.getItem('auth_token');
        if (tokenExists) {
          console.log('Usuario autenticado, iniciando login de Outlook para calendario...');
          window.location.href = '/api/auth/login';
          return;
        } else {
          setCurrentView('login');
        }
      }
      
      setIsLoading(false);
    };

    checkStoredToken();
  }, []);

  // Detectar cambios en la ruta del navegador
  useEffect(() => {
    const handleLocationChange = () => {
      const currentPath = window.location.pathname;
      if (isLoggedIn && user) {
        if (currentPath === '/calendar') {
          setCurrentView('calendar');
        } else if (currentPath === '/panel') {
          setCurrentView('panel');
        } else if (currentPath === '/admin' && user.role === 'admin') {
          setCurrentView('admin');
        } else if (currentPath === '/folders') {
          setCurrentView('folders');
        }
      }
    };

    // Escuchar cambios en el historial
    window.addEventListener('popstate', handleLocationChange);
    
    // También verificar la ruta inicial
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [isLoggedIn, user]);

  const handleLogin = async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        }),
      });

      // Verificar si la respuesta es exitosa antes de parsear JSON
      if (!response.ok) {
        // Intentar obtener el mensaje de error del servidor
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error HTTP ${response.status}`);
        } catch (jsonError) {
          // Si no hay JSON válido en la respuesta de error, usar el status
          throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        const userWithToken = {
          ...data.user,
          token: data.token
        };
        setUser(userWithToken);
        setIsLoggedIn(true);
        
        // Verificar si es administrador y redirigir apropiadamente
        if (userWithToken.role === 'admin') {
          setCurrentView('admin');
          window.history.pushState(null, '', '/admin');
          console.log('Login exitoso como administrador:', data);
        } else {
          setCurrentView('folders');
          window.history.pushState(null, '', '/folders');
          console.log('Login exitoso como usuario:', data);
        }

        // Guardar token en localStorage para persistencia
        localStorage.setItem('auth_token', data.token);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const handleSelectFolder = (tipo) => {
    // Aquí puedes manejar la selección de carpeta
    // Por ahora, simplemente vamos al panel
    setCurrentView('panel');
    window.history.pushState(null, '', '/panel');
  };

  const handleGoToAdmin = () => {
    if (user && user.role === 'admin') {
      setCurrentView('admin');
      window.history.pushState(null, '', '/admin');
    }
  };

  const handleLogout = async () => {
    try {
      // Limpiar token del localStorage
      localStorage.removeItem('auth_token');

      setIsLoggedIn(false);
      setUser(null);
      setCurrentView('login');
      window.history.pushState(null, '', '/login');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  // Si está cargando, mostrar loading
  if (isLoading) {
    return (
      <div className="App" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Cargando...</div>
      </div>
    );
  }

  // Si no está logueado, mostrar login
  if (!isLoggedIn) {
    return (
      <div className="App">
        <Login onLogin={handleLogin} onThemeToggle={toggleTheme} isDarkMode={isDarkMode} />
      </div>
    );
  }

  // Si está logueado pero en vista de carpetas
  if (currentView === 'folders') {
    return (
      <div className="App">
        <FolderSelector
          user={user}
          onSelectFolder={handleSelectFolder}
          onLogout={handleLogout}
          onThemeToggle={toggleTheme}
          isDarkMode={isDarkMode}
          onGoToAdmin={user && user.role === 'admin' ? handleGoToAdmin : null}
          onGoToCalendar={() => {
            setCurrentView('calendar');
            window.history.pushState(null, '', '/calendar');
          }}
        />
      </div>
    );
  }

  // Si está logueado y es administrador en vista admin
  if (currentView === 'admin' && user && user.role === 'admin') {
    return (
      <div className="App">
        <AdminPanel
          user={user}
          onLogout={handleLogout}
          onBackToFolders={() => {
            setCurrentView('folders');
            window.history.pushState(null, '', '/folders');
          }}
          onThemeToggle={toggleTheme}
          isDarkMode={isDarkMode}
        />
      </div>
    );
  }

  // Si está logueado y en vista de panel
  if (currentView === 'panel' && user) {
    console.log('Renderizando UserPanel con user:', user, 'currentView:', currentView);
    return <UserPanel
      user={user}
      onLogout={handleLogout}
      onBackToFolders={() => {
        setCurrentView('folders');
        window.history.pushState(null, '', '/folders');
      }}
      onThemeToggle={toggleTheme}
      isDarkMode={isDarkMode}
      onGoToCalendar={() => {
        setCurrentView('calendar');
        window.history.pushState(null, '', '/calendar');
      }}
    />;
  }

  // Si está logueado y en vista de calendario
  if (currentView === 'calendar' && user) {
    return <Calendar
      user={user}
      onLogout={handleLogout}
      onBackToPanel={() => {
        setCurrentView('panel');
        window.history.pushState(null, '', '/panel');
      }}
      onThemeToggle={toggleTheme}
      isDarkMode={isDarkMode}
    />;
  }

  // Fallback - agregar debug
  console.log('Fallback render - isLoggedIn:', isLoggedIn, 'currentView:', currentView, 'user:', user);
  return (
    <div className="App">
      <div style={{ padding: '20px', background: 'red', color: 'white' }}>
        <h2>DEBUG INFO:</h2>
        <p>isLoggedIn: {isLoggedIn ? 'true' : 'false'}</p>
        <p>currentView: {currentView}</p>
        <p>user: {user ? JSON.stringify(user) : 'null'}</p>
      </div>
      <Login onLogin={handleLogin} onThemeToggle={toggleTheme} isDarkMode={isDarkMode} />
    </div>
  );
}

export default App;