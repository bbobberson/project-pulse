"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import InfoWorksLogo from '@/components/InfoWorksLogo';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();              // ⬅️ STOP browser form post
    setError(null);
    setLoading(true);

    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (r.status === 401) {
        const { error } = await r.json();
        setError(error ?? "Invalid email or password.");
        return;
      }

      if (r.redirected) {
        router.replace(r.url);       // → /dashboard
        return;
      }

      setError("Unexpected response—please try again.");
    } catch (err: any) {
      setError(err.message ?? "Network error.");
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Pulse</h1>
            <p className="text-gray-600">Welcome back to your project command center</p>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-white p-8 rounded-xl shadow-lg border border-gray-100"
        >
          <form onSubmit={handleSubmit} className="space-y-6"> {/* no action attr */}
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
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 transition-all"
                placeholder="Enter your password"
              />
            </div>
            
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ backgroundColor: '#1C2B45' }}
              className="w-full px-4 py-3 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer font-medium"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <motion.button
                onClick={() => router.push('/auth/signup')}
                whileHover={{ scale: 1.02 }}
                className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                Sign up here
              </motion.button>
            </p>
            
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}