import { Outlet } from '@tanstack/react-router';
import { type ReactNode, useState, useCallback, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalCommandPalette } from '@/components/GlobalCommandPalette';
import { useThemeStore } from '@/stores/themeStore';
import { applyTheme } from '@/stores/themeStore';

export function MainLayout({ content }: { content?: ReactNode }) {
  const [openCommand, setOpenCommand] = useState(false);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const openSearch = useCallback(() => {
    setOpenCommand(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpenCommand((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <Sidebar onOpenSearch={openSearch} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenSearch={openSearch} />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="page-shell">
            {content ?? <Outlet />}
          </div>
        </main>
      </div>
      <GlobalCommandPalette open={openCommand} onOpenChange={setOpenCommand} />
    </div>
  );
}
