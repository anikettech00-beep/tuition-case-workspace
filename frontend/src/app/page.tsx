'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    router.replace(user.role === 'PARENT' ? '/parent/cases' : '/tutor/cases');
  }, [user, isLoading, router]);

  return <LoadingSpinner />;
}
