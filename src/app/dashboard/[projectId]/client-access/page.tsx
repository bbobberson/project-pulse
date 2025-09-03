'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import { SignOutButton } from '@/components/SignOutButton'

interface Token {
  id: string
  token: string
  client_email: string
  expires_at: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

interface Project {
  id: string
  name: string
  client_name: string
}

interface ClientUser {
  id: string
  name: string
  email: string
  role: string
  email_notifications: boolean
}

export default function ClientAccessPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([])
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedClientEmail, setSelectedClientEmail] = useState('')
  const [newTokenDays, setNewTokenDays] = useState(30)
  const [generatedLink, setGeneratedLink] = useState('')

  useEffect(() => {
    fetchProjectAndTokens()
  }, [projectId])

  async function fetchProjectAndTokens() {
    try {
      // Get current user and project
      const response = await fetch('/api/auth/me', { credentials: 'include' })
      if (!response.ok) {
        router.push('/auth/login')
        return
      }

      const { user } = await response.json()

      // Get project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, client_name')
        .eq('id', projectId)
        .eq('pm_user_id', user.id)
        .single()

      if (projectError || !projectData) {
        router.push('/dashboard')
        return
      }

      setProject(projectData)

      // Get client users for this project
      const { data: clientUsersData, error: clientUsersError } = await supabase
        .from('client_users')
        .select('id, name, email, role, email_notifications')
        .eq('project_id', projectId)
        .order('name')

      if (!clientUsersError && clientUsersData) {
        setClientUsers(clientUsersData)
        // Set first client user as default
        if (clientUsersData.length > 0) {
          setSelectedClientEmail(clientUsersData[0].email)
        }
      }

      // Get existing tokens
      const tokenResponse = await fetch(`/api/client-tokens?projectId=${projectId}`)
      const tokenData = await tokenResponse.json()
      
      if (tokenData.tokens) {
        setTokens(tokenData.tokens)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generateToken() {
    if (!selectedClientEmail.trim()) {
      alert('Please select a client user')
      return
    }

    setGenerating(true)
    
    try {
      const response = await fetch('/api/client-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          clientEmail: selectedClientEmail,
          expiresInDays: newTokenDays
        })
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedLink(data.clientUrl)
        setSelectedClientEmail('')
        setNewTokenDays(30)
        fetchProjectAndTokens() // Refresh token list
      } else {
        alert(data.error || 'Failed to generate token')
      }
    } catch (error) {
      console.error('Error generating token:', error)
      alert('Failed to generate token')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Link copied to clipboard!')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-6">
              <InfoWorksLogo width={100} height={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Client Access Management</h1>
                <p className="text-gray-600">{project.name} • {project.client_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Dashboard
              </button>
              <SignOutButton className="text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Generate New Token Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Access Link</h2>
          {clientUsers.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">No Client Users Found</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    You need to add client users to this project before generating access links. Go to the project details page and add client users in the "Client Users" section.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Client User
                </label>
                <select
                  value={selectedClientEmail}
                  onChange={(e) => setSelectedClientEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-brand text-gray-900"
                >
                  <option value="">Choose a client user...</option>
                  {clientUsers.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expires in (days)
              </label>
              <select
                value={newTokenDays}
                onChange={(e) => setNewTokenDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-brand text-gray-900"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
              </div>
            </div>
          )}
          <button
            onClick={generateToken}
            disabled={generating || !selectedClientEmail.trim() || clientUsers.length === 0}
            style={{ backgroundColor: '#1C2B45' }}
            className="mt-4 px-6 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Secure Link'}
          </button>
        </div>

        {/* Generated Link Display */}
        {generatedLink && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Access Link Generated!</h3>
            <div className="bg-white border border-green-300 rounded-lg p-3">
              <label className="block text-sm font-medium text-green-800 mb-2">
                Secure Client Access Link:
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-white text-gray-900 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(generatedLink)}
                  className="px-4 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700 text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
            <p className="text-sm text-green-700 mt-3">
              Send this secure link to your client. It expires in {newTokenDays} days and provides access only to this project.
            </p>
          </div>
        )}

        {/* Active Access Links */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Access Links</h2>
          {tokens.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No access links have been generated yet.</p>
              <p className="text-sm mt-2">Generate your first secure link above to share project updates with clients.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div key={token.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-medium text-gray-900">{token.client_email}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          token.is_active && new Date(token.expires_at) > new Date()
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {token.is_active && new Date(token.expires_at) > new Date() ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Created: {formatDate(token.created_at)}</div>
                        <div>Expires: {formatDate(token.expires_at)}</div>
                        {token.last_used_at && (
                          <div>Last used: {formatDate(token.last_used_at)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const baseUrl = window.location.origin
                          const link = `${baseUrl}/client?token=${token.token}`
                          copyToClipboard(link)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-300 rounded"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}