'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth, logout } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import LoadingScreen from '../../components/common/LoadingScreen';

const FolderSelector = dynamic(() => import('../../components/userpanel/FolderSelector'), { ssr: false });

export default function FoldersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  if (loading || !user) return <LoadingScreen />;

  return (
    <div className="App">
      <FolderSelector
        user={user}
        onSelectFolder={(tipo: string) => {
          if (tipo === 'remote') {
            router.push('/remote');
          } else {
            router.push('/panel');
          }
        }}
        onLogout={() => logout()}
        onThemeToggle={toggleTheme}
        isDarkMode={isDarkMode}
        onGoToAdmin={user.role === 'admin' ? () => router.push('/admin') : undefined}
        onGoToCalendar={() => router.push('/calendar')}
        onGoToRemote={() => router.push('/remote')}
      />
    </div>
  );
}
