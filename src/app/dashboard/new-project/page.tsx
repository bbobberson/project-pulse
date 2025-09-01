'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase-browser'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useFormValidation } from '@/hooks/useFormValidation'

interface ClientUser {
  email: string
  name: string
  email_notifications: boolean
}

interface PMUser {
  id: string
  full_name: string
  email: string
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
    email_notifications: true
  })
  const [pmUsers, setPmUsers] = useState<PMUser[]>([])
  const [currentUser, setCurrentUser] = useState<PMUser | null>(null)
  const [previousTeamMembers, setPreviousTeamMembers] = useState<string[]>([])
  const [teamMemberInput, setTeamMemberInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    dangerous: false,
    onConfirm: () => {},
    onCancel: () => {}
  })

  // Form validation rules
  const validationRules = {
    name: { required: true, minLength: 2, maxLength: 100 },
    client_name: { required: true, minLength: 2, maxLength: 100 },
    start_date: { required: true },
    end_date: { required: true, dateAfter: 'start_date' },
    pm_assigned: { required: true },
    onedrive_link: { url: true }
  }

  const { errors, validateAll, markFieldTouched, getFieldError } = useFormValidation(validationRules, formData)

  // Fetch PM users and current user on component mount
  useEffect(() => {
    fetchPmUsers()
    fetchCurrentUser()
    fetchPreviousTeamMembers()
  }, [])

  // Set page title
  useEffect(() => {
    document.title = "New Project • Project Pulse by InfoWorks"
  }, [])

  const fetchPmUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('pm_users')
        .select('id, full_name, email')
        .order('full_name')
      
      if (error) {
        console.error('Error fetching PM users:', error)
      } else {
        setPmUsers(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return

      const { data, error } = await supabase
        .from('pm_users')
        .select('id, full_name, email')
        .eq('id', user.id)
        .single()
      
      if (!error && data) {
        setCurrentUser(data)
        setFormData(prev => ({
          ...prev,
          pm_assigned: data.full_name
        }))
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const fetchPreviousTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('team_members')
      
      if (error) {
        console.error('Error fetching previous team members:', error)
      } else {
        const allMembers = new Set<string>()
        data?.forEach(project => {
          if (project.team_members && Array.isArray(project.team_members)) {
            project.team_members.forEach((member: string) => {
              if (member.trim()) allMembers.add(member.trim())
            })
          }
        })
        setPreviousTeamMembers(Array.from(allMembers).sort())
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleTeamMemberInputChange = (value: string) => {
    setTeamMemberInput(value)
    
    if (value.length > 0) {
      const filtered = previousTeamMembers.filter(member =>
        member.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5) // Show max 5 suggestions
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
      setFilteredSuggestions([])
    }
  }

  const selectTeamMemberSuggestion = (member: string) => {
    const currentMembers = formData.team_members ? formData.team_members.split(',').map(m => m.trim()).filter(Boolean) : []
    if (!currentMembers.includes(member)) {
      const newMembers = [...currentMembers, member].join(', ')
      setFormData(prev => ({
        ...prev,
        team_members: newMembers
      }))
    }
    setTeamMemberInput('')
    setShowSuggestions(false)
    setFilteredSuggestions([])
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
      email_notifications: true
    })
  }
  
  const removeClientUser = (index: number) => {
    const userToRemove = clientUsers[index]
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Client User',
      message: `Are you sure you want to remove "${userToRemove.name}" (${userToRemove.email}) from this project?`,
      confirmText: 'Yes, Remove',
      dangerous: true,
      onConfirm: () => {
        setClientUsers(prev => prev.filter((_, i) => i !== index))
        setConfirmDialog({ ...confirmDialog, isOpen: false })
      },
      onCancel: () => setConfirmDialog({ ...confirmDialog, isOpen: false })
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!validateAll()) {
      // Mark all fields as touched to show errors
      Object.keys(validationRules).forEach(field => markFieldTouched(field))
      return
    }

    setLoading(true)

    try {
      // Get current user to assign project to them
      const { data: { user }, error: authError } = await supabase.auth.getUser()
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
            pm_user_id: currentUser?.id || user.id, // Use selected PM or fallback to current user
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-6">
              <motion.button
                onClick={() => router.push('/dashboard')}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Dashboard
              </motion.button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
                <p className="text-gray-600 mt-1">Set up a new project for seamless client collaboration</p>
              </div>
            </div>
            <div className="flex items-center">
              <InfoWorksLogo width={120} height={36} />
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          onSubmit={handleSubmit} 
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                onBlur={() => markFieldTouched('name')}
                className={`w-full px-4 py-3 border rounded-lg focus-brand text-gray-900 placeholder-gray-500 transition-all ${
                  getFieldError('name') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Website Redesign Project"
              />
              {getFieldError('name') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
              )}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500 transition-all"
                placeholder="e.g., Acme Corporation"
              />
            </div>

            {/* PM Assigned */}
            <div>
              <label htmlFor="pm_assigned" className="block text-sm font-medium text-gray-700 mb-2">
                Assigned PM *
              </label>
              <select
                id="pm_assigned"
                name="pm_assigned"
                required
                value={formData.pm_assigned}
                onChange={(e) => {
                  const selectedPM = pmUsers.find(pm => pm.full_name === e.target.value)
                  setCurrentUser(selectedPM || null)
                  handleChange(e)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 cursor-pointer"
              >
                <option value="">Select Assigned PM</option>
                {pmUsers.map((pm) => (
                  <option key={pm.id} value={pm.full_name}>
                    {pm.full_name}
                  </option>
                ))}
              </select>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500 transition-all"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500 transition-all"
              />
            </div>

            {/* Team Members */}
            <div className="md:col-span-2">
              <label htmlFor="team_members" className="block text-sm font-medium text-gray-700 mb-2">
                Team Members
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="team_members"
                  name="team_members"
                  value={formData.team_members}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500 transition-all"
                  placeholder="e.g., John Smith, Jane Doe, Mike Wilson (comma separated)"
                />
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Type to add team member..."
                    value={teamMemberInput}
                    onChange={(e) => handleTeamMemberInputChange(e.target.value)}
                    onFocus={() => {
                      if (previousTeamMembers.length > 0 && !teamMemberInput) {
                        setFilteredSuggestions(previousTeamMembers.slice(0, 5))
                        setShowSuggestions(true)
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicking
                      setTimeout(() => setShowSuggestions(false), 200)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500 text-sm"
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredSuggestions.map((member, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectTeamMemberSuggestion(member)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm text-gray-900 border-b border-gray-100 last:border-b-0"
                        >
                          {member}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">Separate multiple team members with commas, or use the suggestion box below</p>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500 transition-all"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500 transition-all"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500 transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500 transition-all"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={addClientUser}
                      disabled={!newUser.email.trim()}
                      className="w-full px-4 py-3 btn-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
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
                          {user.email_notifications && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                              Notifications
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClientUser(index)}
                        className="text-red-600 hover:text-red-800 text-sm cursor-pointer"
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
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer font-medium"
          >
            Cancel
          </motion.button>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{ backgroundColor: '#1C2B45' }}
            className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer font-medium"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </motion.button>
        </div>
        </motion.form>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          dangerous={confirmDialog.dangerous}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      </div>
    </div>
  )
}