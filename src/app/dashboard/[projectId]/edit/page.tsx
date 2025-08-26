'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

interface ClientUser {
  id?: string
  email: string
  name: string
  role: 'viewer' | 'stakeholder' | 'admin'
  email_notifications: boolean
  is_active: boolean
}

export default function EditProject() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    start_date: '',
    end_date: '',
    pm_assigned: '',
    team_members: '',
    onedrive_link: '',
    overall_summary: '',
    overall_status: 'on-track'
  })
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([])
  const [newUser, setNewUser] = useState<ClientUser>({
    email: '',
    name: '',
    role: 'viewer',
    email_notifications: true,
    is_active: true
  })

  useEffect(() => {
    fetchProjectData()
  }, [projectId])

  async function fetchProjectData() {
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) {
        console.error('Error fetching project:', projectError)
        router.push('/dashboard')
        return
      }

      // Set form data
      setFormData({
        name: projectData.name || '',
        client_name: projectData.client_name || '',
        start_date: projectData.start_date || '',
        end_date: projectData.end_date || '',
        pm_assigned: projectData.pm_assigned || '',
        team_members: Array.isArray(projectData.team_members) 
          ? projectData.team_members.join(', ') 
          : projectData.team_members || '',
        onedrive_link: projectData.onedrive_link || '',
        overall_summary: projectData.overall_summary || '',
        overall_status: projectData.overall_status || 'on-track'
      })

      // Fetch client users
      const { data: clientUsersData, error: clientUsersError } = await supabase
        .from('client_users')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)

      if (clientUsersError) {
        console.error('Error fetching client users:', clientUsersError)
      } else {
        setClientUsers(clientUsersData || [])
      }

    } catch (err) {
      console.error('Error:', err)
      router.push('/dashboard')
    } finally {
      setFetchingData(false)
    }
  }

  const addClientUser = () => {
    if (!newUser.email.trim()) return
    
    // Check for duplicate emails
    if (clientUsers.some(user => user.email.toLowerCase() === newUser.email.toLowerCase())) {
      alert('This email is already added')
      return
    }
    
    setClientUsers(prev => [...prev, { ...newUser }])
    setNewUser({
      email: '',
      name: '',
      role: 'viewer',
      email_notifications: true,
      is_active: true
    })
  }
  
  const removeClientUser = (index: number) => {
    setClientUsers(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Update the project
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          ...formData,
          team_members: formData.team_members.split(',').map(member => member.trim()).filter(Boolean),
          end_date: formData.end_date || null
        })
        .eq('id', projectId)

      if (projectError) {
        console.error('Error updating project:', projectError)
        alert('Error updating project. Please try again.')
        return
      }

      // Handle client users - first deactivate all existing users
      const { error: deactivateError } = await supabase
        .from('client_users')
        .update({ is_active: false })
        .eq('project_id', projectId)

      if (deactivateError) {
        console.error('Error deactivating client users:', deactivateError)
      }

      // Add/reactivate client users
      if (clientUsers.length > 0) {
        for (const user of clientUsers) {
          if (user.id) {
            // Reactivate existing user
            const { error } = await supabase
              .from('client_users')
              .update({
                name: user.name || null,
                role: user.role,
                email_notifications: user.email_notifications,
                is_active: true
              })
              .eq('id', user.id)

            if (error) {
              console.error('Error updating client user:', error)
            }
          } else {
            // Add new user
            const { error } = await supabase
              .from('client_users')
              .insert({
                project_id: projectId,
                email: user.email,
                name: user.name || null,
                role: user.role,
                email_notifications: user.email_notifications,
                is_active: true,
                created_by: formData.pm_assigned
              })

            if (error) {
              console.error('Error adding client user:', error)
            }
          }
        }
      }

      console.log('Project updated successfully')
      router.push('/dashboard')
    } catch (err) {
      console.error('Error:', err)
      alert('Error updating project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading project details...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              ← Back to Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Project</h1>
              <p className="text-gray-600">Update project details and client access</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., Website Redesign Project"
              />
            </div>

            {/* Client Name */}
            <div>
              <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                id="client_name"
                name="client_name"
                required
                value={formData.client_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., Acme Corporation"
              />
            </div>

            {/* PM Assigned */}
            <div>
              <label htmlFor="pm_assigned" className="block text-sm font-medium text-gray-700 mb-2">
                Project Manager *
              </label>
              <input
                type="text"
                id="pm_assigned"
                name="pm_assigned"
                required
                value={formData.pm_assigned}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., Sarah Johnson"
              />
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                required
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                required
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Overall Status */}
            <div>
              <label htmlFor="overall_status" className="block text-sm font-medium text-gray-700 mb-2">
                Project Status
              </label>
              <select
                id="overall_status"
                name="overall_status"
                value={formData.overall_status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="on-track">🟢 On Track</option>
                <option value="at-risk">🟡 At Risk</option>
                <option value="off-track">🔴 Off Track</option>
                <option value="completed">✅ Completed</option>
                <option value="cancelled">❌ Cancelled</option>
              </select>
            </div>

            {/* Team Members */}
            <div className="md:col-span-2">
              <label htmlFor="team_members" className="block text-sm font-medium text-gray-700 mb-2">
                Team Members
              </label>
              <input
                type="text"
                id="team_members"
                name="team_members"
                value={formData.team_members}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., John Smith, Jane Doe, Mike Wilson (comma separated)"
              />
              <p className="text-sm text-gray-500 mt-1">Separate multiple team members with commas</p>
            </div>

            {/* OneDrive Link */}
            <div className="md:col-span-2">
              <label htmlFor="onedrive_link" className="block text-sm font-medium text-gray-700 mb-2">
                OneDrive/File Sharing Link
              </label>
              <input
                type="url"
                id="onedrive_link"
                name="onedrive_link"
                value={formData.onedrive_link}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., https://company-my.sharepoint.com/..."
              />
            </div>

            {/* Project Summary */}
            <div className="md:col-span-2">
              <label htmlFor="overall_summary" className="block text-sm font-medium text-gray-700 mb-2">
                Project Summary
              </label>
              <textarea
                id="overall_summary"
                name="overall_summary"
                rows={3}
                value={formData.overall_summary}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="Brief description of the project goals and scope..."
              />
            </div>

            {/* Client Users Section */}
            <div className="md:col-span-2">
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Client Users</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Manage client team members who have access to view project updates.
                </p>
                
                {/* Add New User Form */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Add Client User</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <input
                        type="email"
                        placeholder="Email address"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Full name"
                        value={newUser.name}
                        onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'viewer' | 'stakeholder' | 'admin' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="stakeholder">Stakeholder</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={addClientUser}
                        disabled={!newUser.email.trim()}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add User
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="email-notifications"
                      checked={newUser.email_notifications}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email_notifications: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="email-notifications" className="ml-2 text-sm text-gray-600">
                      Send email notifications for project updates
                    </label>
                  </div>
                </div>
                
                {/* Client Users List */}
                {clientUsers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Current Users ({clientUsers.length})</h4>
                    {clientUsers.map((user, index) => (
                      <div key={user.id || index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                              {user.name && <p className="text-sm text-gray-500">{user.email}</p>}
                            </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user.role}
                            </span>
                            {user.email_notifications && (
                              <span className="text-xs text-green-600">📧 Notifications</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeClientUser(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#1C2B45' }}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}