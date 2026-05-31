'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth, logout } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { NotificationProvider } from '../../context/NotificationContext';
import LoadingScreen from '../../components/common/LoadingScreen';

const RemotePage = dynamic(() => import('../../components/remote/RemotePage'), { ssr: false });

export default function RemoteRoute() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  if (loading || !user) return <LoadingScreen />;

  return (
    <NotificationProvider user={user} onNavigate={(path: string) => router.push(path)}>
      <RemotePage
        user={user}
        onLogout={() => logout()}
        onGoBack={() => router.push('/folders')}
        onGoToPanel={() => router.push('/panel')}
        onGoToCalendar={() => router.push('/calendar')}
        onThemeToggle={toggleTheme}
        isDarkMode={isDarkMode}
      />
    </NotificationProvider>
  );
}
