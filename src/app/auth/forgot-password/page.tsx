"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import InfoWorksLogo from '@/components/InfoWorksLogo';
import { createClient } from '@supabase/supabase-js';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      // Try using client-side Supabase directly
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password-callback`,
      });

      if (error) {
        console.error('Client-side reset error:', error);
        
        // Handle rate limiting with user-friendly message
        if (error.message.includes('rate limit') || error.message.includes('Too many requests')) {
          setError('Please wait a few minutes before requesting another password reset.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('This email address is not registered. Please contact your administrator.');
        } else {
          setError('Unable to send reset email. Please try again later or contact support.');
        }
      } else {
        setSent(true);
      }
    } catch (err: any) {
      console.error('Reset error:', err);
      setError(`Error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <InfoWorksLogo width={180} height={54} />
          
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
            <p className="text-gray-600 mb-8">
              We've sent password reset instructions to<br />
              <span className="font-medium text-gray-900">{email}</span>
            </p>
            
            <motion.button
              onClick={() => router.push('/auth/login')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-4 py-3 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all cursor-pointer font-medium"
            >
              Back to sign in
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset your password</h1>
            <p className="text-gray-600">Enter your email and we'll send you reset instructions</p>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-white p-8 rounded-xl shadow-lg border border-gray-100"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 transition-all"
                placeholder="your.email@company.com"
              />
            </div>
            
            <motion.button
              type="submit"
              disabled={loading || !email.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ backgroundColor: '#1C2B45' }}
              className="w-full px-4 py-3 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer font-medium"
            >
              {loading ? 'Sending...' : 'Send reset instructions'}
            </motion.button>
          </form>
          
          <div className="mt-6 text-center">
            <motion.button
              onClick={() => router.push('/auth/login')}
              whileHover={{ scale: 1.02 }}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors"
            >
              Back to sign in
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}