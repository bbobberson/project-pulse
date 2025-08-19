'use client'

import { useState, useEffect } from 'react'

interface ClientTokenManagerProps {
  projectId: string
  projectName: string
  clientName: string
}

interface Token {
  id: string
  token: string
  client_email: string
  expires_at: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

export default function ClientTokenManager({ projectId, projectName, clientName }: ClientTokenManagerProps) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [newTokenEmail, setNewTokenEmail] = useState('')
  const [newTokenDays, setNewTokenDays] = useState(30)
  const [generatedLink, setGeneratedLink] = useState('')
  const [showLinkModal, setShowLinkModal] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTokens()
    }
  }, [isOpen, projectId])

  async function fetchTokens() {
    try {
      const response = await fetch(`/api/client-tokens?projectId=${projectId}`)
      const data = await response.json()
      
      if (data.tokens) {
        setTokens(data.tokens)
      }
    } catch (error) {
      console.error('Error fetching tokens:', error)
    }
  }

  async function generateToken() {
    if (!newTokenEmail.trim()) {
      alert('Please enter a client email address')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/client-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          clientEmail: newTokenEmail,
          expiresInDays: newTokenDays
        })
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedLink(data.clientUrl)
        setShowLinkModal(true)
        setNewTokenEmail('')
        setNewTokenDays(30)
        fetchTokens() // Refresh token list
      } else {
        alert(data.error || 'Failed to generate token')
      }
    } catch (error) {
      console.error('Error generating token:', error)
      alert('Failed to generate token')
    } finally {
      setLoading(false)
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
      >
        🔗 Manage Client Access
      </button>
    )
  }

  return (
    <>
      {/* Token Manager Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Client Access Management</h2>
                <p className="text-gray-600">{projectName} • {clientName}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Generate New Token */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-3">Generate New Access Link</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Client Email Address
                  </label>
                  <input
                    type="email"
                    value={newTokenEmail}
                    onChange={(e) => setNewTokenEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Expires in (days)
                  </label>
                  <select
                    value={newTokenDays}
                    onChange={(e) => setNewTokenDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              </div>
              <button
                onClick={generateToken}
                disabled={loading || !newTokenEmail.trim()}
                style={{ backgroundColor: '#1C2B45' }}
                className="mt-3 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Secure Link'}
              </button>
            </div>

            {/* Existing Tokens */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Active Access Links</h3>
              {tokens.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No access links have been generated yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
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
      </div>

      {/* Generated Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="text-green-600 text-4xl mb-2">✅</div>
                <h3 className="text-lg font-semibold text-gray-900">Access Link Generated!</h3>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                <p>Send this secure link to your client. It expires in {newTokenDays} days and provides access only to this project.</p>
              </div>
              
              <button
                onClick={() => setShowLinkModal(false)}
                style={{ backgroundColor: '#1C2B45' }}
                className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}