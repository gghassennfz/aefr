'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireBusiness?: boolean;
}

export default function ProtectedRoute({ children, requireBusiness = false }: ProtectedRouteProps) {
  const { user, business, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      if (requireBusiness && !business) {
        router.push('/onboarding/business');
        return;
      }
    }
  }, [user, business, loading, router, requireBusiness]);

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-secondary-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireBusiness && !business) {
    return null;
  }

  return <>{children}</>;
}
