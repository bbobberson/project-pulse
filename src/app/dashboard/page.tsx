'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase-browser'
import { supabase as supabaseAuth } from '@/lib/supabase-browser'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import ClientTokenManager from '@/components/ClientTokenManager'
import OnboardingModal from '@/components/OnboardingModal'

interface Project {
  id: string
  name: string
  client_name: string
  start_date: string
  end_date: string | null
  pm_assigned: string
  overall_status: string
  overall_summary: string | null
  created_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    fullName: '',
    company: 'InfoWorks'
  })
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    async function fetchProjects() {
      try {
        // Get current user from session
        const response = await fetch('/api/auth/me', { credentials: 'include' })
        if (!response.ok) {
          router.push('/auth/login')
          return
        }

        const { user, pmUser } = await response.json()
        setCurrentUser(pmUser)

        // Update last_login timestamp
        await supabaseAuth
          .from('pm_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id)

        // Fetch only projects assigned to this PM
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('pm_user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching projects:', error)
        } else {
          setProjects(data || [])
        }

        // Fetch pending invitations (only for admin users)
        if (pmUser?.role === 'admin') {
          const { data: invites } = await supabaseAuth
            .from('pm_invitations')
            .select('*')
            .eq('invite_status', 'pending')
            .order('id', { ascending: false })
          
          setPendingInvitations(invites || [])
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)

    try {
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteFormData),
      })

      if (response.ok) {
        alert('Invitation sent successfully!')
        setShowInviteModal(false)
        setInviteFormData({
          email: '',
          fullName: '',
          company: 'InfoWorks'
        })
      } else {
        const { error } = await response.json()
        alert(`Error: ${error}`)
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setInviteLoading(false)
    }
  }

  // Filter projects based on search query and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery === '' || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client_name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || project.overall_status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-25" style={{ backgroundColor: '#fafafa' }}>
      {/* Onboarding Modal */}
      {currentUser && (
        <OnboardingModal userEmail={currentUser.email} />
      )}
      
      {/* Clean Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-center py-8">
            <div className="flex items-center space-x-8">
              <InfoWorksLogo width={120} height={36} />
              <div>
                <h1 className="text-3xl font-light text-gray-900">Project Pulse</h1>
                {currentUser && (
                  <p className="text-gray-400 text-sm mt-1">Welcome back, {currentUser.full_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser?.role === 'admin' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowInviteModal(true)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Invite PM
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/dashboard/new-project')}
                style={{ backgroundColor: '#1C2B45' }}
                className="px-6 py-3 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                New Project
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  router.push('/')
                }}
                className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Sign Out
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          {/* Clean Search and Filter */}
          {projects.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              <motion.div 
                className="flex-1"
                whileHover={{ scale: 1.005 }}
              >
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300 text-gray-900 placeholder-gray-400"
                />
              </motion.div>
              <motion.div 
                className="sm:w-56"
                whileHover={{ scale: 1.005 }}
              >
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300 text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="all">All Projects</option>
                  <option value="on-track">On Track</option>
                  <option value="at-risk">At Risk</option>
                  <option value="off-track">Off Track</option>
                </select>
              </motion.div>
            </div>
          )}

          {/* Pending Invitations (Admin Only) */}
          {currentUser?.role === 'admin' && pendingInvitations.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8"
            >
              <h3 className="text-lg font-medium text-amber-800 mb-4">
                Pending Invitations ({pendingInvitations.length})
              </h3>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-amber-200">
                    <div>
                      <div className="font-medium text-gray-900">{invitation.full_name}</div>
                      <div className="text-sm text-gray-600">{invitation.email}</div>
                      <div className="text-xs text-gray-500">{invitation.company || 'InfoWorks'}</div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                        Awaiting Signup
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Project Count */}
          {projects.length > 0 && (
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-light text-gray-900">
                {filteredProjects.length} Project{filteredProjects.length !== 1 ? 's' : ''}
              </h2>
              {filteredProjects.length !== projects.length && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-sm text-gray-400"
                >
                  filtered from {projects.length} total
                </motion.span>
              )}
            </div>
          )}
          
          {projects.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center py-24"
            >
              <div className="max-w-md mx-auto">
                <h3 className="text-2xl font-light text-gray-900 mb-4">Ready to begin</h3>
                <p className="text-gray-500 mb-8">Create your first project and start tracking progress</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/dashboard/new-project')}
                  style={{ backgroundColor: '#1C2B45' }}
                  className="px-8 py-4 text-white font-medium rounded-2xl hover:opacity-90 transition-opacity"
                >
                  Create Project
                </motion.button>
              </div>
            </motion.div>
          ) : filteredProjects.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-24"
            >
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-light text-gray-900 mb-4">No matches found</h3>
                <p className="text-gray-500 mb-8">Try adjusting your search or filters</p>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Clear filters
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ y: -2 }}
                    className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all duration-300 overflow-hidden"
                  >
                    {/* Minimal Status Indicator */}
                    <div className={`h-0.5 w-full ${
                      project.overall_status === 'on-track' 
                        ? 'bg-gray-900'
                        : project.overall_status === 'off-track'
                        ? 'bg-gray-400'
                        : 'bg-gray-600'
                    }`} />
                    
                    <div className="p-8">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="space-y-1">
                          <h3 className="text-xl font-medium text-gray-900">{project.name}</h3>
                          <p className="text-gray-500">{project.client_name}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            {project.overall_status.replace('-', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Project Info - Simplified */}
                      <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                        <div>
                          <span className="text-gray-400">PM</span>
                          <p className="text-gray-900 font-medium">{project.pm_assigned}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Timeline</span>
                          <p className="text-gray-900 font-medium">
                            {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                          </p>
                        </div>
                      </div>

                      {/* Actions - Tesla-style clean buttons */}
                      <div className="flex flex-wrap gap-3">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push(`/dashboard/${project.id}/update-pulse`)}
                          style={{ backgroundColor: '#1C2B45' }}
                          className="px-6 py-2.5 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                        >
                          Update Pulse
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push(`/dashboard/${project.id}/roadmap`)}
                          className="px-6 py-2.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          Roadmap
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push(`/dashboard/${project.id}/edit`)}
                          className="px-6 py-2.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </motion.button>
                        <div className="ml-auto">
                          <ClientTokenManager 
                            projectId={project.id}
                            projectName={project.name}
                            clientName={project.client_name}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Invite PM Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Invite PM</h2>
            
            <form onSubmit={handleInviteSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="pm@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteFormData.fullName}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={inviteFormData.company}
                  onChange={(e) => setInviteFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="InfoWorks"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  style={{ backgroundColor: '#1C2B45' }}
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}