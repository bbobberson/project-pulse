'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...')

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.from('users').select('count')
        if (error) {
          setConnectionStatus(`Error: ${error.message}`)
        } else {
          setConnectionStatus('✅ Database connection successful!')
        }
      } catch (err) {
        setConnectionStatus('❌ Connection failed')
      }
    }
    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Database Test</h1>
        <p className="text-lg">{connectionStatus}</p>
        <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to home
        </a>
      </div>
    </div>
  )
}