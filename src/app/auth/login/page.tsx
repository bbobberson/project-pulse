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
  const [showBetaForm, setShowBetaForm] = useState(false);
  const [betaEmail, setBetaEmail] = useState("");
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaMessage, setBetaMessage] = useState<string | null>(null);

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

  async function handleBetaSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Custom validation (Tesla-style - clean and minimal)
    if (!betaEmail.trim()) {
      setBetaMessage('Please enter your email address.');
      return;
    }
    
    if (!betaEmail.includes('@') || !betaEmail.includes('.')) {
      setBetaMessage('Please enter a valid email address.');
      return;
    }
    
    setBetaLoading(true);
    setBetaMessage(null);

    try {
      console.log('Sending beta interest for:', betaEmail.trim());
      
      const response = await fetch('/api/beta-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: betaEmail.trim() })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        setBetaMessage('✅ ' + data.message + ' (Email sent!)');
        setBetaEmail('');
        // Smooth auto-hide after success
        setTimeout(() => {
          // Smoothly fade out the entire form
          setShowBetaForm(false);
        }, 2000);
      } else {
        setBetaMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setBetaMessage('Network error. Please check your connection.');
    } finally {
      setBetaLoading(false);
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
            <p className="text-gray-600">Transparency. Delivered.</p>
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
          
          <div className="mt-6 text-center space-y-4">
            <motion.button
              onClick={() => router.push('/auth/forgot-password')}
              whileHover={{ scale: 1.02 }}
              className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
            >
              Forgot password?
            </motion.button>
            
            {/* Beta Interest Capture - Now visible for design improvements */}
            <div>
              {!showBetaForm ? (
                <motion.button
                  onClick={() => setShowBetaForm(true)}
                  whileHover={{ scale: 1.01 }}
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                >
                  Interested in early access?
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ 
                    duration: 0.6, 
                    ease: [0.16, 1, 0.3, 1],
                    height: { duration: 0.8 },
                    opacity: { duration: 0.4 }
                  }}
                  className="text-left overflow-hidden"
                >
                  <form onSubmit={handleBetaSubmit} className="pt-3">
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: 0.15, 
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1]
                      }}
                    >
                      <input
                        type="email"
                        value={betaEmail}
                        onChange={(e) => setBetaEmail(e.target.value)}
                        placeholder="Enter your email to learn more"
                        autoFocus
                        className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-gray-200 focus:border-gray-400 focus:outline-none text-gray-900 transition-all duration-300 placeholder-gray-400 font-light"
                      />
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: 0.3, 
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1]
                      }}
                      className="flex justify-end items-center pt-3 space-x-4"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowBetaForm(false);
                          setBetaEmail('');
                          setBetaMessage(null);
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-all duration-200 font-light"
                      >
                        close
                      </button>
                      
                      <motion.button
                        type="submit"
                        disabled={betaLoading}
                        whileHover={{ scale: 1.2, x: 4 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 15 
                        }}
                        className="text-xs cursor-pointer transition-all duration-200 disabled:opacity-50 font-medium px-2 py-1"
                        style={{ color: '#1C2B45' }}
                      >
                        {betaLoading ? '...' : '→'}
                      </motion.button>
                    </motion.div>
                  </form>
                  
                  {betaMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ 
                        duration: 0.5, 
                        ease: [0.16, 1, 0.3, 1] 
                      }}
                      className="text-xs text-gray-500 mt-2 font-light"
                    >
                      {betaMessage}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}