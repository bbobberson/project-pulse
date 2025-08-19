'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteEmail = searchParams.get('email') || ''
  
  const [formData, setFormData] = useState({
    email: inviteEmail,
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // Check if this is an invitation signup (has token in URL)
      const token = searchParams.get('token')
      
      if (token) {
        // This is an invitation - use verifyOtp
        const { data, error } = await supabase.auth.verifyOtp({
          email: formData.email,
          token: token,
          type: 'invite',
          password: formData.password
        })

        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        // Success - redirect to dashboard  
        router.push('/dashboard')
      } else {
        // Regular signup flow
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
            }
          }
        })

        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        // Redirect to dashboard
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Removed success screen - NextAuth handles everything

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-center text-gray-900 mb-2">Project Pulse</h1>
          <h2 className="text-xl text-center text-gray-600 mb-8">Create PM Account</h2>
          {inviteEmail && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
              You've been invited to manage projects on Project Pulse!
            </div>
          )}
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSignUp} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Your full name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={!!inviteEmail}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100"
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
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Create a secure password"
              />
              <p className="text-sm text-gray-500 mt-1">Must be at least 6 characters</p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Confirm your password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#1C2B45' }}
              className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/auth/login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign in here
              </button>
            </p>
            
            <div className="mt-4">
              <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignUp() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpForm />
    </Suspense>
  )
}