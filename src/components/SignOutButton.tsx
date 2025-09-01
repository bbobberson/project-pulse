'use client';

import { supabase } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Redirect immediately to prevent flash, then sign out
      router.replace('/auth/login');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect on error
      router.replace('/auth/login');
    }
  };

  return (
    <button onClick={handleLogout} className={className}>
      {children || 'Sign Out'}
    </button>
  );
}