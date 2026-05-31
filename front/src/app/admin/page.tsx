'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth, logout } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { NotificationProvider } from '../../context/NotificationContext';
import LoadingScreen from '../../components/common/LoadingScreen';

const AdminPanel = dynamic(() => import('../../components/admin/AdminPanel'), { ssr: false });

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth(true);
  const { isDarkMode, toggleTheme } = useTheme();

  if (loading || !user) return <LoadingScreen />;

  return (
    <NotificationProvider user={user} onNavigate={(path: string) => router.push(path)}>
      <div className="App">
        <AdminPanel
          user={user}
          onLogout={() => logout()}
          onBackToFolders={() => router.push('/folders')}
          onThemeToggle={toggleTheme}
          isDarkMode={isDarkMode}
        />
      </div>
    </NotificationProvider>
  );
}
