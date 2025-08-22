'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SignUpPage() {
  const supabase = createClientComponentClient(); // client-only

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Pulse</h1>
          <h2 className="text-lg text-gray-600">Create PM Account</h2>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            style: {
              button: { background: '#1C2B45', color: 'white' },
              anchor: { color: '#1C2B45' },
            }
          }}
          view="sign_up"
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`}
        />
      </div>
    </div>
  );
}