import { Outlet } from '@tanstack/react-router';
import { type ReactNode, useState, useCallback, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalCommandPalette } from '@/components/GlobalCommandPalette';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { getSearchShortcutLabel } from '@/lib/shortcut';

export function MainLayout({ content }: { content?: ReactNode }) {
  const [openCommand, setOpenCommand] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl+K');

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

  useEffect(() => {
    setShortcutLabel(getSearchShortcutLabel());
  }, []);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[var(--color-background)]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onOpenSearch={openSearch}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          shortcutLabel={shortcutLabel}
        />
        <main className="mobile-safe-inline min-h-0 flex-1 overflow-y-auto px-0 py-6 lg:py-10">
          <div className="page-shell">
            {content ?? <Outlet />}
          </div>
        </main>
      </div>
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-[320px] p-0 lg:hidden">
          <SheetTitle className="sr-only">Navegación principal</SheetTitle>
          <Sidebar mobile onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      <GlobalCommandPalette open={openCommand} onOpenChange={setOpenCommand} />
    </div>
  );
}
