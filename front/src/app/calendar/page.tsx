'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth, logout } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { NotificationProvider } from '../../context/NotificationContext';
import LoadingScreen from '../../components/common/LoadingScreen';

const Calendar = dynamic(() => import('../../components/calendar/Calendar'), { ssr: false });

export default function CalendarPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  if (loading || !user) return <LoadingScreen />;

  return (
    <NotificationProvider user={user} onNavigate={(path: string) => router.push(path)}>
      <Calendar
        key={user.username}
        user={user}
        onLogout={() => logout()}
        onBackToPanel={() => router.push('/panel')}
        onBackToFolders={() => router.push('/folders')}
        onGoToRemote={() => router.push('/remote')}
        onThemeToggle={toggleTheme}
        isDarkMode={isDarkMode}
      />
    </NotificationProvider>
  );
}
