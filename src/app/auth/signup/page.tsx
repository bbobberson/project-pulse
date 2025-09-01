'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import InfoWorksLogo from '@/components/InfoWorksLogo';

export default function SignUpPage() {
  const supabase = createClientComponentClient(); // client-only

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block mb-6"
          >
            <InfoWorksLogo width={180} height={54} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Pulse</h1>
            <p className="text-gray-600">Create your project management account</p>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100"
        >
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: { 
                  background: '#1C2B45', 
                  color: 'white',
                  borderRadius: '0.75rem',
                  fontWeight: '500',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer'
                },
                anchor: { color: '#1C2B45' },
                input: {
                  borderRadius: '0.75rem',
                  border: '1px solid #D1D5DB',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                },
                label: {
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                },
                message: {
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem'
                }
              },
              variables: {
                default: {
                  colors: {
                    brand: '#1C2B45',
                    brandAccent: '#1C2B45',
                  },
                  borderWidths: {
                    buttonBorderWidth: '0px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '12px',
                    buttonBorderRadius: '12px',
                    inputBorderRadius: '12px',
                  }
                }
              }
            }}
            view="sign_up"
            redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/dashboard`}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}