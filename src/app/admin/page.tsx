'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import { SignOutButton } from '@/components/SignOutButton'

interface PMUser {
  id: string
  email: string
  full_name: string | null
  company: string | null
  role: string
  is_active: boolean
  invite_status: string
  invited_at: string
  last_login: string | null
}

interface Project {
  id: string
  name: string
  client_name: string
  overall_status: string
  pm_user_id: string | null
  pm_assigned: string
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [pmUsers, setPMUsers] = useState<PMUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    fullName: '',
    company: 'InfoWorks'
  })
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchPMUsers()
    fetchAllProjects()
    fetchInvitations()
  }, [])

  async function checkAuth() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/auth/login')
        return
      }

      // Check if user is admin
      const { data: pmUser, error: pmError } = await supabase
        .from('pm_users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (pmError || pmUser?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setUser(user)
      setCurrentUser(pmUser)
    } catch (err) {
      console.error('Auth error:', err)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPMUsers() {
    try {
      const { data, error } = await supabase
        .from('pm_users')
        .select('*')
        .eq('invite_status', 'accepted')    // only accepted
        .eq('is_active', true)              // only active
        .order('full_name', { ascending: true })

      if (error) {
        console.error('Error fetching PM users:', error)
      } else {
        setPMUsers(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function fetchAllProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching projects:', error)
      } else {
        setProjects(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function fetchInvitations() {
    try {
      // Just show empty list for now - invitations work, just not showing in admin
      setInvitations([])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function handleInvitePM(e: React.FormEvent) {
    e.preventDefault()
    
    // Prevent double execution
    if (inviteLoading) return
    setInviteLoading(true)

    // Freeze the invite data at the start
    const inviteEmail = inviteFormData.email.trim()
    const invitePayload = {
      email: inviteEmail,
      fullName: inviteFormData.fullName.trim(),
      company: inviteFormData.company.trim() || 'InfoWorks'
    }

    console.log('🚀 Sending invitation to:', inviteEmail)

    try {
      // Send the invitation email via API (which also handles the invitation record)
      const emailResponse = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitePayload)
      })

      const emailResult = await emailResponse.json()

      if (emailResult.success) {
        alert(`🎉 Invitation email sent to ${inviteEmail}! They should receive it shortly and will be able to create their account.`)
        // Reset form and refresh data on success
        setInviteFormData({ email: '', fullName: '', company: 'InfoWorks' })
        setShowInviteForm(false)
        fetchInvitations()
      } else {
        console.error('Invitation error:', emailResult.error)
        alert(`⚠️ Failed to send invitation: ${emailResult.error}. Please try again.`)
      }

    } catch (err) {
      console.error('Error:', err)
      alert('Error sending invitation. Please try again.')
    } finally {
      setInviteLoading(false)
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('pm_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user status:', error)
        alert('Error updating user status')
      } else {
        fetchPMUsers()
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'bg-green-100 text-green-800'
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800'
      case 'off-track':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getInviteStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <InfoWorksLogo width={100} height={32} />
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-2xl font-bold text-gray-900">Project Pulse</h1>
                <p className="text-gray-600">System Admin Dashboard</p>
              </div>
              {currentUser && (
                <div className="border-l border-gray-300 pl-4">
                  <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
                  <p className="text-xs text-gray-500">{currentUser.role.toUpperCase()} • {currentUser.company || 'InfoWorks'}</p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowInviteForm(!showInviteForm)}
                style={{ backgroundColor: '#1C2B45' }}
                className="text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                + Invite PM
              </button>
              <SignOutButton className="text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg">
                Logout
              </SignOutButton>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Invite PM Form */}
        {showInviteForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite New Project Manager</h3>
            <form onSubmit={handleInvitePM} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-brand text-gray-900"
                  placeholder="pm@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteFormData.fullName}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-brand text-gray-900"
                  placeholder="John Smith"
                />
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  style={{ backgroundColor: '#1C2B45' }}
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pending Invitations Section */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations ({invitations.length})</h2>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div>
                    <div className="font-medium text-gray-900">{invitation.full_name}</div>
                    <div className="text-sm text-gray-600">{invitation.email}</div>
                    <div className="text-xs text-gray-500">
                      Invited {new Date(invitation.invited_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending Signup
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {invitation.company}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PM Users Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Managers ({pmUsers.length})</h2>
          
          {pmUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No project managers yet. Invite your first PM to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name & Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invite Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pmUsers.map((pmUser) => (
                    <tr key={pmUser.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {pmUser.full_name || 'Unnamed User'}
                          </div>
                          <div className="text-sm text-gray-500">{pmUser.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pmUser.company || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pmUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {pmUser.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getInviteStatusColor(pmUser.invite_status)
                        }`}>
                          {pmUser.invite_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pmUser.last_login ? new Date(pmUser.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {pmUser.role !== 'admin' && (
                          <button
                            onClick={() => toggleUserStatus(pmUser.id, pmUser.is_active)}
                            className={`text-xs px-3 py-1 rounded ${
                              pmUser.is_active 
                                ? 'text-red-600 hover:text-red-800' 
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            {pmUser.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* All Projects Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Projects ({projects.length})</h2>
          
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No projects created yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-600">{project.client_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.overall_status)}`}>
                      {project.overall_status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">PM:</span> {project.pm_assigned}
                    <span className="ml-4 font-medium">Created:</span> {new Date(project.created_at).toLocaleDateString()}
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