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
      console.log('Logging out...'); // Debug log
      await supabase.auth.signOut();
      console.log('Logout successful, redirecting...'); // Debug log
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error); // Debug log
    }
  };

  return (
    <button onClick={handleLogout} className={className}>
      {children || 'Sign Out'}
    </button>
  );
}