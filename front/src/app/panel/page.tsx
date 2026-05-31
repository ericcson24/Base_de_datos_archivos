'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth, logout } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { NotificationProvider } from '../../context/NotificationContext';
import LoadingScreen from '../../components/common/LoadingScreen';

const UserPanel = dynamic(() => import('../../components/userpanel/UserPanel'), { ssr: false });

export default function PanelPage() {
  const router = useRouter();
  const { user, loading, updateUser } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  if (loading || !user) return <LoadingScreen />;

  return (
    <NotificationProvider user={user} onNavigate={(path: string) => router.push(path)}>
      <UserPanel
        user={user}
        onLogout={() => logout()}
        onBackToFolders={() => router.push('/folders')}
        onThemeToggle={toggleTheme}
        isDarkMode={isDarkMode}
        onGoToCalendar={() => router.push('/calendar')}
        onGoToRemote={() => router.push('/remote')}
        onUserUpdate={updateUser}
      />
    </NotificationProvider>
  );
}
