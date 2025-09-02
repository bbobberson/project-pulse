'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase-browser'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import ClientTokenManager from '@/components/ClientTokenManager'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Project {
  id: string
  name: string
  client_name: string
  start_date: string
  end_date: string | null
  pm_assigned: string
  team_members: string
  onedrive_link: string
  overall_summary: string | null
  overall_status: string
  created_at: string
}

interface ClientUser {
  id?: string
  email: string
  name: string
  email_notifications: boolean
  is_active: boolean
}

export default function ProjectDetails() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([])
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newClientUser, setNewClientUser] = useState({ name: '', email: '' })
  const [previousTeamMembers, setPreviousTeamMembers] = useState<string[]>([])
  const [teamMemberInput, setTeamMemberInput] = useState('')
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [flashField, setFlashField] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    dangerous: false,
    onConfirm: () => {},
    onCancel: () => {}
  })

  useEffect(() => {
    fetchProjectData()
    fetchClientUsers()
    fetchPreviousTeamMembers()
  }, [projectId])

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
    } catch (error) {
      console.error('Error fetching previous team members:', error)
    }
  }

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      
      setProject(data)
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClientUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('client_users')
        .select('*')
        .eq('project_id', projectId)

      if (error) throw error
      setClientUsers(data || [])
    } catch (error) {
      console.error('Error fetching client users:', error)
    }
  }


  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ overall_status: newStatus })
        .eq('id', projectId)

      if (error) throw error

      await fetchProjectData()
      setShowStatusDropdown(false)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleFieldEdit = (fieldName: string, currentValue: any) => {
    setEditingField(fieldName)
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : currentValue || '')
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleFieldSave = async (fieldName: string, customValue?: any) => {
    try {
      setSaving(true)
      let valueToSave = customValue !== undefined ? customValue : editValue
      
      // Handle team_members array conversion for text input
      if (fieldName === 'team_members' && typeof valueToSave === 'string') {
        valueToSave = valueToSave.split(',').map(member => member.trim()).filter(member => member)
      }
      
      const { error } = await supabase
        .from('projects')
        .update({ [fieldName]: valueToSave })
        .eq('id', projectId)

      if (error) throw error

      await fetchProjectData()
      await fetchPreviousTeamMembers()
      setEditingField(null)
      setEditValue('')
      showToast('Saved successfully', 'success')
      
      // Flash the field green
      setFlashField(fieldName)
      setTimeout(() => setFlashField(null), 1000)
    } catch (error) {
      console.error('Error updating field:', error)
      showToast('Failed to save changes', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleFieldCancel = () => {
    setEditingField(null)
    setEditValue('')
    setTeamMemberInput('')
    setShowSuggestions(false)
    setFilteredSuggestions([])
  }

  const handleTeamMemberInputChange = (value: string) => {
    setTeamMemberInput(value)
    if (value.trim()) {
      const filtered = previousTeamMembers.filter(member => 
        member.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5)
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectTeamMemberSuggestion = (member: string) => {
    const currentMembers = Array.isArray(project.team_members) 
      ? project.team_members 
      : project.team_members?.split(',').map(m => m.trim()).filter(Boolean) || []
    
    if (!currentMembers.includes(member)) {
      const newMembers = [...currentMembers, member]
      handleFieldSave('team_members', newMembers)
    }
    setTeamMemberInput('')
    setShowSuggestions(false)
    setFilteredSuggestions([])
  }

  const addTeamMemberFromInput = () => {
    if (teamMemberInput.trim()) {
      const currentMembers = Array.isArray(project.team_members) 
        ? project.team_members 
        : project.team_members?.split(',').map(m => m.trim()).filter(Boolean) || []
      
      if (!currentMembers.includes(teamMemberInput.trim())) {
        const newMembers = [...currentMembers, teamMemberInput.trim()]
        handleFieldSave('team_members', newMembers)
      }
      setTeamMemberInput('')
      setShowSuggestions(false)
      setFilteredSuggestions([])
    }
  }

  const removeTeamMember = (memberToRemove: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Team Member',
      message: `Are you sure you want to remove "${memberToRemove}" from this project? This will remove them from any task assignments.`,
      confirmText: 'Yes, Remove',
      dangerous: true,
      onConfirm: () => {
        const currentMembers = Array.isArray(project.team_members) 
          ? project.team_members 
          : project.team_members?.split(',').map(m => m.trim()).filter(Boolean) || []
        
        const newMembers = currentMembers.filter(member => member !== memberToRemove)
        handleFieldSave('team_members', newMembers)
        setConfirmDialog({ ...confirmDialog, isOpen: false })
      },
      onCancel: () => setConfirmDialog({ ...confirmDialog, isOpen: false })
    })
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full"
        />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project not found</h1>
          <motion.button
            onClick={() => router.push('/dashboard')}
            style={{ backgroundColor: '#1C2B45' }}
            className="px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Back to Dashboard
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6">
              <motion.button
                onClick={() => router.push('/dashboard')}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer"
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
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-gray-600 mt-1">{project.client_name}</p>
              </div>
            </div>
            <InfoWorksLogo />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status and Actions Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <motion.button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${
                  project.overall_status === 'on-track'
                    ? 'bg-green-100 text-green-800'
                    : project.overall_status === 'at-risk'
                    ? 'bg-yellow-100 text-yellow-800'
                    : project.overall_status === 'off-track'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {project.overall_status.replace('-', ' ')}
                <svg className="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.button>
              
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                  {['on-track', 'at-risk', 'off-track'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        handleStatusUpdate(status)
                        setShowStatusDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer ${
                        project.overall_status === status ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      <span className="capitalize">{status.replace('-', ' ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <motion.button
              onClick={() => router.push(`/dashboard/${projectId}/update-pulse`)}
              className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Update Pulse
            </motion.button>
            <motion.button
              onClick={() => router.push(`/dashboard/${projectId}/roadmap`)}
              className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2l6 3 6-3v15l-6 3-6-3z" />
              </svg>
              Roadmap
            </motion.button>
          </div>
        </div>

        {/* Project Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Project Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-500 text-sm">Project Manager</label>
                {editingField === 'pm_assigned' ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFieldSave('pm_assigned')
                        if (e.key === 'Escape') handleFieldCancel()
                      }}
                      onBlur={() => handleFieldSave('pm_assigned')}
                      className="flex-1 px-3 py-1 text-gray-900 font-medium bg-white border border-gray-300 rounded focus-brand"
                      autoFocus
                    />
                    {saving ? (
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                    ) : (
                      <button
                        onClick={() => handleFieldCancel()}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : (
                  <p 
                    onClick={() => handleFieldEdit('pm_assigned', project.pm_assigned)}
                    className={`text-gray-900 font-medium hover:bg-gray-50 px-3 py-1 rounded cursor-pointer transition-all ${
                      flashField === 'pm_assigned' ? 'border-2 border-green-500 bg-green-50' : ''
                    }`}
                  >
                    {project.pm_assigned}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-500 text-sm">Start Date</label>
                  {editingField === 'start_date' ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFieldSave('start_date')
                          if (e.key === 'Escape') handleFieldCancel()
                        }}
                        onBlur={() => handleFieldSave('start_date')}
                        className="flex-1 px-3 py-1 text-gray-900 font-medium bg-white border border-gray-300 rounded focus-brand"
                        autoFocus
                      />
                      {saving ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                      ) : (
                        <button
                          onClick={() => handleFieldCancel()}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ) : (
                    <p 
                      onClick={() => handleFieldEdit('start_date', project.start_date)}
                      className={`text-gray-900 font-medium hover:bg-gray-50 px-3 py-1 rounded cursor-pointer transition-all ${
                        flashField === 'start_date' ? 'border-2 border-green-500 bg-green-50' : ''
                      }`}
                    >
                      {new Date(project.start_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-gray-500 text-sm">End Date</label>
                  {editingField === 'end_date' ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFieldSave('end_date')
                          if (e.key === 'Escape') handleFieldCancel()
                        }}
                        onBlur={() => handleFieldSave('end_date')}
                        className="flex-1 px-3 py-1 text-gray-900 font-medium bg-white border border-gray-300 rounded focus-brand"
                        autoFocus
                      />
                      {saving ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                      ) : (
                        <button
                          onClick={() => handleFieldCancel()}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ) : (
                    <p 
                      onClick={() => handleFieldEdit('end_date', project.end_date || '')}
                      className={`text-gray-900 font-medium hover:bg-gray-50 px-3 py-1 rounded cursor-pointer transition-all ${
                        flashField === 'end_date' ? 'border-2 border-green-500 bg-green-50' : ''
                      }`}
                    >
                      {project.end_date ? new Date(project.end_date).toLocaleDateString() : (
                        <span className="text-gray-400 italic">Click to set end date</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-sm">Team Members</label>
                {editingField === 'team_members' ? (
                  <div className="space-y-3">
                    {/* Current Team Members as Tags */}
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(project.team_members) ? project.team_members : []).map((member, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {member}
                          <button
                            onClick={() => removeTeamMember(member)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    
                    {/* Add New Team Member */}
                    <div className="relative">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Add team member..."
                          value={teamMemberInput}
                          onChange={(e) => handleTeamMemberInputChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addTeamMemberFromInput()
                            }
                            if (e.key === 'Escape') handleFieldCancel()
                          }}
                          onFocus={() => {
                            if (previousTeamMembers.length > 0 && !teamMemberInput) {
                              setFilteredSuggestions(previousTeamMembers.slice(0, 5))
                              setShowSuggestions(true)
                            }
                          }}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus-brand"
                          autoFocus
                        />
                        <button
                          onClick={addTeamMemberFromInput}
                          className="px-3 py-2 text-sm btn-primary transition-colors cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                      
                      {/* Suggestions Dropdown */}
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {filteredSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => selectTeamMemberSuggestion(suggestion)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg cursor-pointer"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleFieldCancel()}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className={`text-gray-900 font-medium flex-1 px-3 py-1 rounded transition-all ${
                      flashField === 'team_members' ? 'border-2 border-green-500 bg-green-50' : ''
                    }`}>
                      {Array.isArray(project.team_members) && project.team_members.length > 0
                        ? project.team_members.join(', ')
                        : <span className="text-gray-400 italic">Click to add team members</span>
                      }
                    </p>
                    <button
                      onClick={() => handleFieldEdit('team_members', project.team_members)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors ml-3"
                      title="Manage team members"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-gray-500 text-sm">OneDrive Link</label>
                {editingField === 'onedrive_link' ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFieldSave('onedrive_link')
                        if (e.key === 'Escape') handleFieldCancel()
                      }}
                      onBlur={() => handleFieldSave('onedrive_link')}
                      placeholder="https://..."
                      className="flex-1 px-3 py-1 text-gray-900 font-medium bg-white border border-gray-300 rounded focus-brand"
                      autoFocus
                    />
                    {saving ? (
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                    ) : (
                      <button
                        onClick={() => handleFieldCancel()}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : project.onedrive_link ? (
                  <div className="flex items-center space-x-2">
                    <p 
                      onClick={() => handleFieldEdit('onedrive_link', project.onedrive_link)}
                      className={`text-gray-900 font-medium hover:bg-gray-50 px-3 py-1 rounded cursor-pointer transition-all flex-1 ${
                        flashField === 'onedrive_link' ? 'border-2 border-green-500 bg-green-50' : ''
                      }`}
                    >
                      {project.onedrive_link}
                    </p>
                    <button
                      onClick={() => navigator.clipboard?.writeText(project.onedrive_link)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                      title="Copy link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <p 
                    onClick={() => handleFieldEdit('onedrive_link', '')}
                    className="text-gray-400 hover:bg-gray-50 px-3 py-1 rounded cursor-pointer transition-colors italic"
                  >
                    Click to add OneDrive link
                  </p>
                )}
              </div>
              <div>
                <label className="text-gray-500 text-sm">Client Users</label>
                {editingField === 'client_users' ? (
                  <div className="space-y-3">
                    {/* Existing Users */}
                    {clientUsers.map((user, index) => (
                      <div key={user.id || index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                        <div className="flex-1">
                          <span className="text-gray-900 font-medium">{user.name}</span>
                          <span className="text-gray-500 text-sm ml-2">({user.email})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from('client_users')
                                .update({ is_active: !user.is_active })
                                .eq('id', user.id)
                              if (!error) await fetchClientUsers()
                            }}
                            className={`px-2 py-1 text-xs rounded ${
                              user.is_active 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            } transition-colors`}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from('client_users')
                                .delete()
                                .eq('id', user.id)
                              if (!error) await fetchClientUsers()
                            }}
                            className="px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add New User */}
                    <div className="border-t pt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Name"
                          value={newClientUser.name}
                          onChange={(e) => setNewClientUser({...newClientUser, name: e.target.value})}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setEditingField(null)
                              setNewClientUser({ name: '', email: '' })
                            }
                          }}
                          className="px-3 py-2 text-sm border border-gray-300 rounded focus-brand"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={newClientUser.email}
                          onChange={(e) => setNewClientUser({...newClientUser, email: e.target.value})}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newClientUser.name && newClientUser.email) {
                              e.preventDefault()
                              // Trigger add user
                              const button = e.currentTarget.parentElement?.parentElement?.querySelector('button')
                              if (button) button.click()
                            }
                            if (e.key === 'Escape') {
                              setEditingField(null)
                              setNewClientUser({ name: '', email: '' })
                            }
                          }}
                          className="px-3 py-2 text-sm border border-gray-300 rounded focus-brand"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={async () => {
                            if (newClientUser.name && newClientUser.email) {
                              const { error } = await supabase
                                .from('client_users')
                                .insert([{ 
                                  ...newClientUser, 
                                  project_id: projectId, 
                                  is_active: true,
                                  email_notifications: true 
                                }])
                              if (!error) {
                                await fetchClientUsers()
                                setNewClientUser({ name: '', email: '' })
                              }
                            }
                          }}
                          disabled={!newClientUser.name || !newClientUser.email}
                          className="px-3 py-1 text-sm text-white btn-primary disabled:bg-gray-400 rounded transition-colors"
                        >
                          Add User
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          setEditingField(null)
                          setNewClientUser({ name: '', email: '' })
                        }}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 font-medium flex-1">
                      {clientUsers.filter(user => user.is_active).length > 0
                        ? clientUsers.filter(user => user.is_active).map(user => user.name).join(', ')
                        : <span className="text-gray-400 italic">No active client users</span>
                      }
                      {clientUsers.filter(user => !user.is_active).length > 0 && (
                        <span className="text-gray-400 text-sm ml-2">
                          (+{clientUsers.filter(user => !user.is_active).length} inactive)
                        </span>
                      )}
                    </p>
                    <button
                      onClick={() => setEditingField('client_users')}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors ml-3"
                      title="Manage client users"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Project Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 group"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Project Summary</h3>
            {editingField === 'overall_summary' ? (
              <div className="space-y-3">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleFieldSave('overall_summary')
                    if (e.key === 'Escape') handleFieldCancel()
                  }}
                  placeholder="Brief project overview..."
                  className="w-full px-3 py-2 text-gray-700 leading-relaxed bg-white border border-gray-300 rounded-lg focus-brand resize-y"
                  rows={editValue ? Math.max(3, editValue.split('\n').length + 1) : 3}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleFieldCancel()}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleFieldSave('overall_summary')}
                    style={{ backgroundColor: '#1C2B45' }}
                    className="px-3 py-1 text-sm text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <p 
                  onClick={() => handleFieldEdit('overall_summary', project.overall_summary)}
                  className={`text-gray-700 leading-relaxed hover:bg-gray-50 px-3 py-2 rounded cursor-pointer transition-all ${
                    flashField === 'overall_summary' ? 'border-2 border-green-500 bg-green-50' : ''
                  }`}
                >
                  {project.overall_summary || (
                    <span className="text-gray-400 italic">Click to add project summary</span>
                  )}
                </p>
                <button
                  onClick={() => handleFieldEdit('overall_summary', project.overall_summary)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✎
                </button>
              </div>
            )}
          </motion.div>
        </div>


        {/* Client Access Management - Temporarily commented out for manual workaround */}
        {/*
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Client Access Management</h3>
          <ClientTokenManager projectId={projectId} />
        </motion.div>
        */}
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        </div>
      )}

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
  )
}