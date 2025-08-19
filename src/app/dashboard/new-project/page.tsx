'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { supabaseAuth } from '@/lib/supabase-browser'

interface ClientUser {
  email: string
  name: string
  role: 'viewer' | 'stakeholder' | 'admin'
  email_notifications: boolean
}

export default function NewProject() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    start_date: '',
    end_date: '',
    pm_assigned: '',
    team_members: '',
    onedrive_link: '',
    overall_summary: ''
  })
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([])
  const [newUser, setNewUser] = useState<ClientUser>({
    email: '',
    name: '',
    role: 'viewer',
    email_notifications: true
  })

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
      email_notifications: true
    })
  }
  
  const removeClientUser = (index: number) => {
    setClientUsers(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current user to assign project to them
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
      if (authError || !user) {
        alert('Authentication error. Please login again.')
        router.push('/auth/login')
        return
      }

      // Create the project first
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            ...formData,
            team_members: formData.team_members.split(',').map(member => member.trim()).filter(Boolean),
            end_date: formData.end_date || null,
            pm_user_id: user.id, // Assign to current PM user
            created_by: user.id   // Track who created it
          }
        ])
        .select()
        .single()

      if (projectError) {
        console.error('Error creating project:', projectError)
        alert('Error creating project. Please try again.')
        return
      }

      // Add client users if any were specified
      if (clientUsers.length > 0) {
        console.log('Attempting to save client users:', clientUsers)
        const clientUserInserts = clientUsers.map(user => ({
          project_id: projectData.id,
          email: user.email,
          name: user.name || null,
          role: user.role,
          email_notifications: user.email_notifications,
          created_by: formData.pm_assigned
        }))
        
        console.log('Client user inserts:', clientUserInserts)

        const { data: insertedUsers, error: clientUsersError } = await supabase
          .from('client_users')
          .insert(clientUserInserts)
          .select()

        if (clientUsersError) {
          console.error('Error adding client users:', clientUsersError)
          alert(`Project created, but there was an issue adding client users: ${clientUsersError.message}. You can add them later.`)
        } else {
          console.log('Successfully inserted client users:', insertedUsers)
        }
      } else {
        console.log('No client users to save')
      }

      console.log('Project created successfully:', projectData)
      router.push('/dashboard')
    } catch (err) {
      console.error('Error:', err)
      alert('Error creating project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
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
              <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
              <p className="text-gray-600">Set up a new project for client status tracking</p>
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
                End Date (Optional)
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              />
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
                Add client team members who will have access to view project updates.
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
                  <h4 className="text-sm font-medium text-gray-900">Added Users ({clientUsers.length})</h4>
                  {clientUsers.map((user, index) => (
                    <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
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
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}