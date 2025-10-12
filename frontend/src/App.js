import React, { useState } from 'react';
import Login from './components/Login';
import UserPanel from './components/UserPanel';
import FolderSelector from './components/FolderSelector';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // 'login', 'folders', 'panel'

  const handleLogin = async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setIsLoggedIn(true);
        setCurrentView('folders'); // Después del login, mostrar selector de carpetas
        console.log('Login exitoso:', data);
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
      setIsLoggedIn(false);
      setUser(null);
      setCurrentView('login');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

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
    return <UserPanel
      user={user}
      onLogout={handleLogout}
      onBackToFolders={() => setCurrentView('folders')}
    />;
  }

  // Fallback
  return (
    <div className="App">
      <Login onLogin={handleLogin} />
    </div>
  );
}

export default App;