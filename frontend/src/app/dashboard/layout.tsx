'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  HomeIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  CalendarIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  DocumentDuplicateIcon as DocumentDuplicateIconSolid,
  CurrencyEuroIcon as CurrencyEuroIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  CalendarIcon as CalendarIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon, iconSolid: HomeIconSolid },
  { name: 'Factures', href: '/dashboard/invoices', icon: DocumentTextIcon, iconSolid: DocumentTextIconSolid },
  { name: 'Devis', href: '/dashboard/quotes', icon: DocumentDuplicateIcon, iconSolid: DocumentDuplicateIconSolid },
  { name: 'Comptabilité', href: '/dashboard/accounting', icon: CurrencyEuroIcon, iconSolid: CurrencyEuroIconSolid },
  { name: 'Analyses', href: '/dashboard/analytics', icon: ChartBarIcon, iconSolid: ChartBarIconSolid },
  { name: 'Calendrier fiscal', href: '/dashboard/calendar', icon: CalendarIcon, iconSolid: CalendarIconSolid },
];

const userNavigation = [
  { name: 'Profil', href: '/dashboard/profile', icon: UserCircleIcon, iconSolid: UserCircleIconSolid },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, business, signOut } = useAuth();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-secondary-50">
        {/* Sidebar pour mobile */}
        <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-secondary-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-full max-w-xs bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-2xl font-bold text-primary-900">BillsFac</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = isActive ? item.iconSolid : item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={isActive ? 'nav-link-active' : 'nav-link-inactive'}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Sidebar pour desktop */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-secondary-200 bg-white">
            <div className="flex items-center flex-shrink-0 px-4 py-4 border-b border-secondary-200">
              <h1 className="text-2xl font-bold text-primary-900">BillsFac</h1>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = isActive ? item.iconSolid : item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={isActive ? 'nav-link-active' : 'nav-link-inactive'}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="px-2 py-4 border-t border-secondary-200">
                <div className="space-y-1">
                  {userNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = isActive ? item.iconSolid : item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={isActive ? 'nav-link-active' : 'nav-link-inactive'}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                  <button
                    onClick={handleSignOut}
                    className="nav-link-inactive w-full text-left"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex flex-col flex-1 lg:pl-64">
          {/* Header */}
          <div className="sticky top-0 z-10 flex h-16 bg-white border-b border-secondary-200 lg:hidden">
            <button
              type="button"
              className="px-4 border-r border-secondary-200 text-secondary-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex items-center">
                <h1 className="text-lg font-semibold text-secondary-900">BillsFac</h1>
              </div>
              <div className="ml-4 flex items-center space-x-4">
                <button
                  type="button"
                  className="bg-white p-1 rounded-full text-secondary-400 hover:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <BellIcon className="w-6 h-6" />
                </button>
                <Link href="/dashboard/profile" className="flex items-center">
                  <UserCircleIcon className="w-8 h-8 text-secondary-400" />
                </Link>
              </div>
            </div>
          </div>

          {/* Header pour desktop */}
          <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-secondary-200">
            <div>
              <h1 className="text-xl font-semibold text-secondary-900">
                Bonjour, {business?.company_name || user?.email}
              </h1>
              <p className="text-sm text-secondary-600">
                Gérez votre activité d'auto-entrepreneur
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="bg-white p-2 rounded-full text-secondary-400 hover:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <BellIcon className="w-5 h-5" />
              </button>
              <Link href="/dashboard/profile" className="flex items-center">
                <UserCircleIcon className="w-8 h-8 text-secondary-400" />
              </Link>
            </div>
          </div>

          {/* Contenu de la page */}
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
