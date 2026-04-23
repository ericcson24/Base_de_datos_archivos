import React, { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import UserPanel from './components/UserPanel/UserPanel';
import AdminPanel from './components/Admin/AdminPanel';
import RemotePage from './components/Remote/RemotePage';
import FolderSelector from './components/UserPanel/FolderSelector';
import Calendar from './components/Calendar/Calendar';
import Roadmap from './components/Roadmap/Roadmap';
import { NotificationProvider } from './context/NotificationContext';
import './App.css';

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
  console.log('APP V2 LOADED - DEBUG MODE');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // 'login', 'folders', 'panel', 'calendar', 'admin', 'roadmap'
  const [isLoading, setIsLoading] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = getCookie('theme');
    return saved === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      setCookie('theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
      setCookie('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleUserUpdate = (updatedFields) => {
    setUser(prev => ({ ...prev, ...updatedFields }));
  };

  useEffect(() => {
    const checkStoredToken = async () => {
      const storedToken = localStorage.getItem('auth_token');
      
      try {
        const headers = {};
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch('/api/auth/verify', {
          headers,
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          
          
          const userWithToken = {
            ...data.user,
            token: storedToken || data.token 
          };
          
          const role = (userWithToken.role || '').toLowerCase();
          userWithToken.role = role;
          
          setUser(userWithToken);
          setIsLoggedIn(true);
          
          if (data.token) {
            localStorage.setItem('auth_token', data.token);
          }
          
          let currentPath = window.location.pathname;
          
          if (currentPath.endsWith('/') && currentPath.length > 1) {
            currentPath = currentPath.slice(0, -1);
            window.history.replaceState(null, '', currentPath);
          }
          
          if (currentPath === '/calendar') {
            setCurrentView('calendar');
          } else if (currentPath === '/panel') {
            setCurrentView('panel');
          } else if (currentPath === '/admin') {
            setCurrentView('admin');
          } else if (currentPath === '/folders') {
            setCurrentView('folders');
          } else if (currentPath === '/remote') {
            setCurrentView('remote');
          } else if (currentPath === '/roadmap') {
            setCurrentView('roadmap');
          } else {
            if (role === 'admin') {
              setCurrentView('admin');
              window.history.replaceState(null, '', '/admin');
            } else {
              setCurrentView('folders');
              window.history.replaceState(null, '', '/folders');
            }
          }
        } else {
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

      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');

      
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

  useEffect(() => {
    const handleLocationChange = () => {
      let currentPath = window.location.pathname;
      if (currentPath.endsWith('/') && currentPath.length > 1) {
        currentPath = currentPath.slice(0, -1);
      }

      if (isLoggedIn && user) {
        if (currentPath === '/calendar') {
          setCurrentView('calendar');
        } else if (currentPath === '/panel') {
          setCurrentView('panel');
        } else if (currentPath === '/remote') {
          setCurrentView('remote');
        } else if (currentPath === '/roadmap') {
          setCurrentView('roadmap');
        } else if (currentPath === '/admin' && user.role === 'admin') {
          setCurrentView('admin');
        } else if (currentPath === '/folders') {
          setCurrentView('folders');
        }
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    
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

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const error = new Error(errorData.message || `Error HTTP ${response.status}`);
          error.code = errorData.errorCode;
          throw error;
        } catch (jsonError) {
          if (jsonError.code) throw jsonError;
          
          throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        const userWithToken = {
          ...data.user,
          token: data.token
        };
        
        const role = (userWithToken.role || '').toLowerCase();
        userWithToken.role = role;

        setUser(userWithToken);
        setIsLoggedIn(true);
        
        if (role === 'admin') {
          setCurrentView('admin');
          window.history.pushState(null, '', '/admin');
          console.log('Login exitoso como administrador:', data);
        } else {
          setCurrentView('folders');
          window.history.pushState(null, '', '/folders');
          console.log('Login exitoso como usuario:', data);
        }

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
    if (tipo === 'remote') {
      setCurrentView('remote');
      window.history.pushState(null, '', '/remote');
      return;
    }
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
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });

      localStorage.removeItem('auth_token');
      
      deleteCookie('auth_token');
      deleteCookie('connect.sid');

      setIsLoggedIn(false);
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Error en logout:', error);
      localStorage.removeItem('auth_token');
      setIsLoggedIn(false);
      setUser(null);
      window.location.href = '/login';
    }
  };

  if (isLoading) {
    return (
      <div className="App app-loading-container">
        <div className="app-loading-content">
          <img className="app-loading-logo" src="/icons/nube.svg" alt="Logo" />
          <div className="app-loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="App">
        <Login onLogin={handleLogin} onThemeToggle={toggleTheme} isDarkMode={isDarkMode} />
      </div>
    );
  }

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
          onGoToRemote={() => {
            setCurrentView('remote');
            window.history.pushState(null, '', '/remote');
          }}
          onGoToRoadmap={() => {
            setCurrentView('roadmap');
            window.history.pushState(null, '', '/roadmap');
          }}
        />
      </div>
    );
  }

  if (currentView === 'admin' && user && user.role === 'admin') {
    return (
      <NotificationProvider 
        user={user}
        onNavigate={(path) => {
          if (path === '/calendar') {
            setCurrentView('calendar');
            window.history.pushState(null, '', '/calendar');
          } else if (path === '/admin') {
            setCurrentView('admin');
            window.history.pushState(null, '', '/admin');
          } else if (path === '/panel') {
            setCurrentView('panel');
            window.history.pushState(null, '', '/panel');
          } else if (path === '/roadmap') {
            setCurrentView('roadmap');
            window.history.pushState(null, '', '/roadmap');
          }
        }}
      >
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
      </NotificationProvider>
    );
  }

  if (currentView === 'panel' && user) {
    console.log('Renderizando UserPanel con user:', user, 'currentView:', currentView);
    return (
      <NotificationProvider 
        user={user}
        onNavigate={(path) => {
          if (path === '/calendar') {
            setCurrentView('calendar');
            window.history.pushState(null, '', '/calendar');
          } else if (path === '/admin') {
            setCurrentView('admin');
            window.history.pushState(null, '', '/admin');
          } else if (path === '/panel') {
            setCurrentView('panel');
            window.history.pushState(null, '', '/panel');
          } else if (path === '/remote') {
            setCurrentView('remote');
            window.history.pushState(null, '', '/remote');
          } else if (path === '/roadmap') {
            setCurrentView('roadmap');
            window.history.pushState(null, '', '/roadmap');
          }
        }}
      >
        <UserPanel
          user={user}
          initialView={currentView}
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
          onGoToRemote={() => {
            setCurrentView('remote');
            window.history.pushState(null, '', '/remote');
          }}
          onUserUpdate={handleUserUpdate}
        />
      </NotificationProvider>
    );
  }

  if (currentView === 'remote' && user) {
    console.log('Renderizando RemotePage independiente con user:', user);
    return (
      <NotificationProvider 
        user={user}
        onNavigate={(path) => {
          if (path === '/calendar') {
            setCurrentView('calendar');
            window.history.pushState(null, '', '/calendar');
          } else if (path === '/admin') {
            setCurrentView('admin');
            window.history.pushState(null, '', '/admin');
          } else if (path === '/panel') {
            setCurrentView('panel');
            window.history.pushState(null, '', '/panel');
          } else if (path === '/remote') {
            setCurrentView('remote');
            window.history.pushState(null, '', '/remote');
          } else if (path === '/roadmap') {
            setCurrentView('roadmap');
            window.history.pushState(null, '', '/roadmap');
          }
        }}
      >
        <RemotePage
          user={user}
          onLogout={handleLogout}
          onGoBack={() => {
            setCurrentView('folders');
            window.history.pushState(null, '', '/folders');
          }}
          onGoToPanel={() => {
            setCurrentView('panel');
            window.history.pushState(null, '', '/panel');
          }}
          onGoToCalendar={() => {
            setCurrentView('calendar');
            window.history.pushState(null, '', '/calendar');
          }}
          onThemeToggle={toggleTheme}
          isDarkMode={isDarkMode}
        />
      </NotificationProvider>
    );
  }

  // Si está logueado y en vista de roadmap
  if (currentView === 'roadmap' && user) {
    return (
      <NotificationProvider 
        user={user}
        onNavigate={(path) => {
          if (path === '/calendar') {
            setCurrentView('calendar');
            window.history.pushState(null, '', '/calendar');
          } else if (path === '/admin') {
            setCurrentView('admin');
            window.history.pushState(null, '', '/admin');
          } else if (path === '/panel') {
            setCurrentView('panel');
            window.history.pushState(null, '', '/panel');
          } else if (path === '/remote') {
            setCurrentView('remote');
            window.history.pushState(null, '', '/remote');
          } else if (path === '/roadmap') {
            setCurrentView('roadmap');
            window.history.pushState(null, '', '/roadmap');
          }
        }}
      >
        <Roadmap
          user={user}
          onLogout={handleLogout}
          onBackToFolders={() => {
            setCurrentView('folders');
            window.history.pushState(null, '', '/folders');
          }}
          onGoToCalendar={() => {
            setCurrentView('calendar');
            window.history.pushState(null, '', '/calendar');
          }}
          onGoToPanel={() => {
            setCurrentView('panel');
            window.history.pushState(null, '', '/panel');
          }}
          onGoToRemote={() => {
            setCurrentView('remote');
            window.history.pushState(null, '', '/remote');
          }}
          onThemeToggle={toggleTheme}
          isDarkMode={isDarkMode}
        />
      </NotificationProvider>
    );
  }

  // Si está logueado y en vista de calendario
  if (currentView === 'calendar' && user) {
    return (
      <NotificationProvider 
        user={user}
        onNavigate={(path) => {
          if (path === '/calendar') {
            setCurrentView('calendar');
            window.history.pushState(null, '', '/calendar');
          } else if (path === '/admin') {
            setCurrentView('admin');
            window.history.pushState(null, '', '/admin');
          } else if (path === '/panel') {
            setCurrentView('panel');
            window.history.pushState(null, '', '/panel');
          } else if (path === '/remote') {
            setCurrentView('remote');
            window.history.pushState(null, '', '/remote');
          } else if (path === '/roadmap') {
            setCurrentView('roadmap');
            window.history.pushState(null, '', '/roadmap');
          }
        }}
      >
        <Calendar
          key={user.username}
          user={user}
          onLogout={handleLogout}
          onBackToPanel={() => {
            setCurrentView('panel');
            window.history.pushState(null, '', '/panel');
          }}
          onBackToFolders={() => {
            setCurrentView('folders');
            window.history.pushState(null, '', '/folders');
          }}
          onGoToRemote={() => {
            setCurrentView('remote');
            window.history.pushState(null, '', '/remote');
          }}
          onGoToRoadmap={() => {
            setCurrentView('roadmap');
            window.history.pushState(null, '', '/roadmap');
          }}
          onThemeToggle={toggleTheme}
          isDarkMode={isDarkMode}
        />
      </NotificationProvider>
    );
  }

  console.log('Fallback render - isLoggedIn:', isLoggedIn, 'currentView:', currentView, 'user:', user);
  return (
    <NotificationProvider 
      user={user}
      onNavigate={(path) => {
        if (path === '/calendar') {
          setCurrentView('calendar');
          window.history.pushState(null, '', '/calendar');
        } else if (path === '/admin') {
          setCurrentView('admin');
          window.history.pushState(null, '', '/admin');
        } else if (path === '/panel') {
          setCurrentView('panel');
          window.history.pushState(null, '', '/panel');
        } else if (path === '/remote') {
          setCurrentView('remote');
          window.history.pushState(null, '', '/remote');
        } else if (path === '/roadmap') {
          setCurrentView('roadmap');
          window.history.pushState(null, '', '/roadmap');
        }
      }}
    >
    <div className="App">
      {isLoggedIn ? (
        <FolderSelector 
          user={user} 
          onSelectFolder={(folder) => {
            setCurrentView('panel');
            window.history.pushState(null, '', '/panel');
          }} 
          onLogout={handleLogout}
          onThemeToggle={toggleTheme}
          isDarkMode={isDarkMode}
        />
      ) : (
        <Login onLogin={handleLogin} onThemeToggle={toggleTheme} isDarkMode={isDarkMode} />
      )}
    </div>
    </NotificationProvider>
  );
}

export default App;
