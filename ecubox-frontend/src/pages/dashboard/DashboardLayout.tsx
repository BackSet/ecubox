import { type ReactNode } from 'react';
import { MainLayout } from '@/app/layout/MainLayout';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return <MainLayout content={children} />;
}
