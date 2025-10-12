import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import UserPanel from './components/UserPanel';
import FolderSelector from './components/FolderSelector';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // 'login', 'folders', 'panel'
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si hay token guardado al cargar la app
  useEffect(() => {
    const checkStoredToken = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          // Verificar si el token es válido haciendo una petición
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser({
              ...data.user,
              token: storedToken
            });
            setIsLoggedIn(true);
            setCurrentView('folders'); // Ir directamente a folders si el token es válido
          } else {
            // Token inválido, limpiarlo
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error('Error verificando token:', error);
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    checkStoredToken();
  }, []);

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

      const data = await response.json();

      if (data.success) {
        const userWithToken = {
          ...data.user,
          token: data.token
        };
        setUser(userWithToken);
        setIsLoggedIn(true);
        setCurrentView('folders'); // VOLVER A LA NAVEGACIÓN NORMAL: login → folders → panel
        console.log('Login exitoso:', data);

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
  };

  const handleLogout = async () => {
    try {
      // Limpiar token del localStorage
      localStorage.removeItem('auth_token');

      setIsLoggedIn(false);
      setUser(null);
      setCurrentView('login');
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
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  // Si está logueado pero en vista de carpetas
  if (currentView === 'folders') {
    return (
      <div className="App">
        <FolderSelector
          onSelectFolder={handleSelectFolder}
          onLogout={handleLogout}
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
      onBackToFolders={() => setCurrentView('folders')}
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
      <Login onLogin={handleLogin} />
    </div>
  );
}

export default App;