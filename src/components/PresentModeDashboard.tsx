'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import { SignOutButton } from '@/components/SignOutButton'

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

interface PresentModeDashboardProps {
  projects: Project[]
  currentUser: any
  pendingInvitations: any[]
  onShowInviteModal: () => void
  onToggleToFutureMode: () => void
  loading?: boolean
}

export default function PresentModeDashboard({ 
  projects, 
  currentUser, 
  pendingInvitations, 
  onShowInviteModal,
  onToggleToFutureMode,
  loading = false
}: PresentModeDashboardProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [loadingButton, setLoadingButton] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [selectedCardIndex, setSelectedCardIndex] = useState(0)
  const [keyboardMode, setKeyboardMode] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleNavigation = async (path: string, buttonId: string) => {
    setLoadingButton(buttonId)
    try {
      router.push(path)
      showToast('Navigating...', 'success')
    } catch (error) {
      showToast('Navigation failed', 'error')
      setLoadingButton(null)
    }
  }

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    // Always exclude archived projects from UI (per requirements)
    if (project.overall_status === 'archived') {
      return false
    }
    
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.client_name.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Handle status filtering with new logic
    let matchesStatus = false
    if (statusFilter === 'all') {
      matchesStatus = true // Show all non-archived
    } else if (statusFilter === 'active') {
      // Active projects are on-track, at-risk, or off-track
      matchesStatus = ['on-track', 'at-risk', 'off-track'].includes(project.overall_status)
    } else if (statusFilter === 'completed') {
      matchesStatus = project.overall_status === 'completed'
    } else {
      // Direct status match (legacy support)
      matchesStatus = project.overall_status === statusFilter
    }
    
    return matchesSearch && matchesStatus
  })

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredProjects.length === 0) return
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setKeyboardMode(true)
        
        let newIndex = selectedCardIndex
        const cols = Math.min(3, filteredProjects.length) // max 3 columns in lg
        const rows = Math.ceil(filteredProjects.length / cols)
        
        if (e.key === 'ArrowRight') {
          newIndex = (selectedCardIndex + 1) % filteredProjects.length
        } else if (e.key === 'ArrowLeft') {
          newIndex = selectedCardIndex === 0 ? filteredProjects.length - 1 : selectedCardIndex - 1
        } else if (e.key === 'ArrowDown') {
          const nextRowIndex = selectedCardIndex + cols
          newIndex = nextRowIndex < filteredProjects.length ? nextRowIndex : selectedCardIndex % cols
        } else if (e.key === 'ArrowUp') {
          const prevRowIndex = selectedCardIndex - cols
          newIndex = prevRowIndex >= 0 ? prevRowIndex : Math.min(filteredProjects.length - 1, selectedCardIndex + (rows - 1) * cols)
        }
        
        setSelectedCardIndex(newIndex)
      } else if (e.key === 'Enter' && keyboardMode) {
        e.preventDefault()
        const selectedProject = filteredProjects[selectedCardIndex]
        if (selectedProject) {
          handleNavigation(`/dashboard/${selectedProject.id}`, `project-${selectedProject.id}`)
        }
      } else if (e.key === 'Escape') {
        setKeyboardMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCardIndex, filteredProjects, keyboardMode])

  // Reset selection when projects change
  useEffect(() => {
    if (selectedCardIndex >= filteredProjects.length) {
      setSelectedCardIndex(Math.max(0, filteredProjects.length - 1))
    }
  }, [filteredProjects.length])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 sm:py-4 space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
              <motion.div
                className="cursor-pointer"
                onClick={onToggleToFutureMode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Click to toggle to Future Mode"
              >
                <div className="hidden sm:block">
                  <InfoWorksLogo width={120} height={36} />
                </div>
                <div className="block sm:hidden">
                  <InfoWorksLogo width={80} height={24} />
                </div>
              </motion.div>
              <div className="hidden sm:block h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Project Pulse</h1>
                {currentUser && (
                  <p className="text-gray-600 text-xs sm:text-sm">{currentUser.full_name}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              {currentUser?.role === 'admin' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onShowInviteModal}
                  className="px-3 py-2 sm:px-4 btn-primary text-xs sm:text-sm font-medium transition-colors cursor-pointer w-full sm:w-auto text-center"
                >
                  Invite PM
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavigation('/dashboard/new-project', 'new-project')}
                disabled={loadingButton === 'new-project'}
                style={{ backgroundColor: '#1C2B45' }}
                className="px-3 py-2 sm:px-4 text-white text-xs sm:text-sm font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                {loadingButton === 'new-project' ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : null}
                <span>New Project</span>
              </motion.button>
              <SignOutButton className="text-gray-600 hover:text-gray-900 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Your Projects</h2>
              <p className="text-gray-600 mt-1">
                {filteredProjects.length === 0 
                  ? `Hi ${currentUser?.full_name?.split(' ')[0] || 'there'}, no projects to show`
                  : filteredProjects.length === 1
                  ? `Welcome back ${currentUser?.full_name?.split(' ')[0] || ''}, you have 1 active project`
                  : `Welcome back ${currentUser?.full_name?.split(' ')[0] || ''}, you have ${filteredProjects.length} active projects`
                }
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus-brand bg-white text-gray-900 placeholder-gray-500 text-base transition-all"
              />
            </div>
            <div className="min-w-[140px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus-brand bg-white text-gray-900 text-base cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22/%3E%3C/svg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat transition-all"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option disabled>──────────</option>
                <option value="on-track">On Track</option>
                <option value="at-risk">At Risk</option>
                <option value="off-track">Off Track</option>
              </select>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="mb-4">
              {projects.length === 0 ? (
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ) : (
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {(() => {
                if (projects.length === 0) {
                  return `Welcome ${currentUser?.full_name?.split(' ')[0] || 'to Project Pulse'}!`
                } else if (searchQuery && statusFilter !== 'all') {
                  return 'No projects match your search and status filter'
                } else if (searchQuery) {
                  return `No projects match "${searchQuery}"`
                } else if (statusFilter !== 'all') {
                  return `No ${statusFilter.replace('-', ' ')} projects found`
                } else {
                  return 'No projects match your filters'
                }
              })()}
            </h3>
            
            <p className="text-gray-600 mb-6">
              {(() => {
                if (projects.length === 0) {
                  return 'Create your first project to start managing your client work and tracking progress.'
                } else if (searchQuery && statusFilter !== 'all') {
                  return 'Try adjusting your search terms or changing the status filter to see more results.'
                } else if (searchQuery) {
                  return 'Try different search terms or clear your search to see all projects.'
                } else if (statusFilter !== 'all') {
                  return 'Try selecting "Show All" to see projects with other statuses.'
                } else {
                  return 'Try clearing your filters to see all projects.'
                }
              })()}
            </p>
            
            {projects.length === 0 ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavigation('/dashboard/new-project', 'create-first')}
                disabled={loadingButton === 'create-first'}
                style={{ backgroundColor: '#1C2B45' }}
                className="px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2 mx-auto cursor-pointer"
              >
                {loadingButton === 'create-first' ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : null}
                <span>Create First Project</span>
              </motion.button>
            ) : (
              <div className="flex items-center justify-center space-x-4">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 btn-secondary transition-colors cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
                {statusFilter !== 'all' && (
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="px-4 py-2 btn-secondary transition-colors cursor-pointer"
                  >
                    Show All
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            <AnimatePresence>
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => {
                    setKeyboardMode(false)
                    handleNavigation(`/dashboard/${project.id}`, `project-${project.id}`)
                  }}
                  className={`bg-white rounded-lg sm:rounded-xl shadow-sm border overflow-hidden transition-all duration-200 cursor-pointer ${
                    keyboardMode && selectedCardIndex === index
                      ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                      : 'border-gray-200 hover:shadow-lg hover:border-gray-300 hover:-translate-y-1'
                  }`}
                >
                  {/* Status Bar */}
                  <div className={`h-3 ${
                    project.overall_status === 'on-track'
                      ? 'bg-green-500'
                      : project.overall_status === 'at-risk'
                      ? 'bg-yellow-500'
                      : project.overall_status === 'off-track'
                      ? 'bg-red-500'
                      : 'bg-gray-400'
                  }`} />
                  
                  <div className="p-4 sm:p-6 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                      <div className="space-y-1 flex-1 min-w-0 sm:pr-3">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-sm sm:text-base text-gray-600">{project.client_name}</p>
                      </div>
                      <div className="flex-shrink-0 self-start sm:self-center">
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${
                          project.overall_status === 'on-track'
                            ? 'bg-green-100 text-green-800'
                            : project.overall_status === 'at-risk'
                            ? 'bg-yellow-100 text-yellow-800'
                            : project.overall_status === 'off-track'
                            ? 'bg-red-100 text-red-800'
                            : project.overall_status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.overall_status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm flex-grow">
                      <div>
                        <span className="text-gray-500 text-xs sm:text-sm">PM</span>
                        <p className="text-gray-900 font-medium text-sm sm:text-base truncate">{project.pm_assigned}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs sm:text-sm">Timeline</span>
                        <p className="text-gray-900 font-medium text-xs sm:text-sm">
                          {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex justify-start">
                      {project.overall_status !== 'completed' && (
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNavigation(`/dashboard/${project.id}/update-pulse`, `pulse-${project.id}`)
                          }}
                          disabled={loadingButton === `pulse-${project.id}`}
                          style={{ backgroundColor: '#1C2B45' }}
                          className="px-3 sm:px-4 py-2 text-white text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1 sm:space-x-2 w-full sm:w-auto"
                        >
                          {loadingButton === `pulse-${project.id}` ? (
                            <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          ) : (
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          <span>Update Pulse</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
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
    </div>
  )
}