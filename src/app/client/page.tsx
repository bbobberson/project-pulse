'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import ClientWelcomeModal from '@/components/ClientWelcomeModal'

interface Project {
  id: string
  name: string
  client_name: string
  start_date: string
  end_date: string | null
  pm_assigned: string
  overall_status: string
  overall_summary: string | null
  team_members: string[] | null
  onedrive_link: string | null
}

interface WeeklySnapshot {
  id: string
  week_number: number
  week_start_date: string
  overall_status: string
  tasks_data: {
    executive_summary?: string
    key_accomplishments?: string
    upcoming_milestones?: string
    risks_and_blockers?: string
    budget_status?: string
    timeline_status?: string
    client_feedback?: string
    next_steps?: string
    completed_tasks?: any[]
    in_progress_tasks?: any[]
    blocked_tasks?: any[]
  }
  created_at: string
  created_by: string
}

function ClientPortalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [clientName, setClientName] = useState('')
  const [tokenData, setTokenData] = useState<{token: string, projectId: string, clientEmail: string} | null>(null)
  const [authError, setAuthError] = useState('')
  const [expandedUpdateId, setExpandedUpdateId] = useState<string | null>(null)
  const [currentReportIndex, setCurrentReportIndex] = useState(0)

  useEffect(() => {
    validateTokenAndFetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchSnapshots(selectedProject.id)
    }
  }, [selectedProject])

  // Set page title
  useEffect(() => {
    document.title = "Client Portal • Project Pulse by InfoWorks"
  }, [])

  async function validateTokenAndFetchProjects() {
    try {
      const token = searchParams.get('token')
      
      if (!token) {
        setAuthError('Access token is required. Please use the link provided by your project manager.')
        setLoading(false)
        return
      }

      // Validate token via API
      const response = await fetch('/api/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setAuthError(result.error || 'Invalid or expired access token. Please contact your project manager for a new link.')
        setLoading(false)
        return
      }

      setTokenData({
        token,
        projectId: result.tokenData.projectId,
        clientEmail: result.tokenData.clientEmail
      })

      const projectData = result.project

      if (!projectData) {
        setAuthError('Project not found or access denied.')
        setLoading(false)
        return
      }

      // Set the single project
      setProjects([projectData])
      setSelectedProject(projectData)
      setClientName(projectData.client_name)
      
    } catch (err) {
      console.error('Error:', err)
      setAuthError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSnapshots(projectId: string) {
    setSnapshotsLoading(true)
    try {
      const { data, error } = await supabase
        .from('weekly_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching snapshots:', error)
      } else {
        // Sort by most recent - show all updates (no deduplication for client portal)
        const recentSnapshots = (data || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        
        setSnapshots(recentSnapshots)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setSnapshotsLoading(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.pm_assigned.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && !['completed', 'cancelled'].includes(project.overall_status)) ||
                         (statusFilter === 'completed' && ['completed', 'cancelled'].includes(project.overall_status))
    
    return matchesSearch && matchesStatus
  })

  // Determine if we should show the project selector
  const shouldShowProjectSelector = projects.length > 1 || 
                                   (projects.length === 1 && statusFilter !== 'active') ||
                                   searchQuery.length > 0

  // Handle case where selected project gets filtered out
  useEffect(() => {
    if (selectedProject && !filteredProjects.some(p => p.id === selectedProject.id)) {
      if (filteredProjects.length === 1) {
        setSelectedProject(filteredProjects[0])
      } else {
        setSelectedProject(null)
      }
    }
  }, [filteredProjects, selectedProject])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading your projects...</div>
      </div>
    )
  }

  if (authError) {
    const isNoToken = authError.includes('Access token is required')
    
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#fafafa' }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4 sm:py-8">
              <div className="flex items-center space-x-3 sm:space-x-8">
                <InfoWorksLogo width={120} height={36} />
                <div>
                  <h1 className="text-xl sm:text-3xl font-light text-gray-900">Project Pulse</h1>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">Client Portal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
          <div className="text-center">
            {isNoToken ? (
              <div>
                <div className="w-16 h-16 mx-auto mb-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
                </div>
                <h2 className="text-3xl sm:text-5xl font-extralight text-gray-900 mb-6">Project Portal</h2>
                <p className="text-xl text-gray-500 mb-16 max-w-lg mx-auto font-light leading-relaxed">
                  Real-time project insights delivered through secure, personalized access
                </p>
                
                <div className="grid md:grid-cols-2 gap-12 mb-16 max-w-4xl mx-auto">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-6 bg-gray-50 rounded-xl flex items-center justify-center">
                      <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Progress Tracking</h4>
                    <p className="text-gray-500 text-sm font-light leading-relaxed">
                      Weekly insights and milestone updates delivered in real-time
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-6 bg-gray-50 rounded-xl flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Interactive Timeline</h4>
                    <p className="text-gray-500 text-sm font-light leading-relaxed">
                      Visual roadmap showing project phases and deliverables
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-6 bg-gray-50 rounded-xl flex items-center justify-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Security First</h4>
                    <p className="text-gray-500 text-sm font-light leading-relaxed">
                      Private access with enterprise-grade security protocols
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-6 bg-gray-50 rounded-xl flex items-center justify-center">
                      <div className="w-4 h-1 bg-gray-300 rounded"></div>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Always Current</h4>
                    <p className="text-gray-500 text-sm font-light leading-relaxed">
                      Live updates as your project evolves and progresses
                    </p>
                  </div>
                </div>

                <div className="max-w-md mx-auto">
                  <div className="text-center p-8 bg-white rounded-3xl border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Access Required</h3>
                    <p className="text-gray-500 text-sm font-light mb-4">
                      Your project manager will provide a secure link to access your dashboard
                    </p>
                    <div className="w-24 h-1 bg-gray-100 rounded mx-auto"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-red-600 text-5xl mb-4">🔒</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Required</h2>
                <p className="text-gray-600 mb-6">{authError}</p>
                <div className="text-sm text-gray-500">
                  <p>Contact your project manager for a new secure link.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Project Pulse</h1>
                <p className="text-gray-600">Client Portal</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600">There are currently no projects to display.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Welcome Modal for First-Time Users */}
      {selectedProject && (
        <ClientWelcomeModal 
          projectName={selectedProject.name}
          clientName="Bill Butler"
          pmName={selectedProject.pm_assigned}
        />
      )}
      
      {/* Tesla-Inspired Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-8 space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-8 w-full sm:w-auto">
              <div className="hidden sm:block">
                <InfoWorksLogo width={120} height={36} />
              </div>
              <div className="block sm:hidden">
                <InfoWorksLogo width={90} height={27} />
              </div>
              {selectedProject && (
                <>
                  <div className="hidden sm:block w-px h-8 bg-gray-300"></div>
                  <div>
                    <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">{selectedProject.name}</h1>
                    <p className="text-gray-500 text-xs sm:text-sm mt-1">Welcome, Bill Butler</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              {selectedProject && (
                <>
                  <button
                    onClick={() => router.push(`/client/${selectedProject.id}/roadmap?token=${tokenData?.token}`)}
                    className="flex items-center px-4 py-3 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer font-medium text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m2-6h10a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                    </svg>
                    Roadmap
                  </button>

                  {selectedProject.onedrive_link && (
                    <a
                      href={selectedProject.onedrive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-3 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer font-medium text-sm sm:text-base w-full sm:w-auto justify-center sm:justify-start"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
                      </svg>
                      Files
                    </a>
                  )}
                  
                  <div className="block sm:flex sm:justify-center w-full sm:w-auto mt-2 sm:mt-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(selectedProject.overall_status)} block text-center sm:inline`}>
                      {selectedProject.overall_status}
                    </span>
                  </div>
                </>
              )}
              
              {selectedProject && (
                <div className="hidden sm:block text-right border-l border-gray-300 pl-4">
                  <p className="text-sm text-gray-500">Project Manager</p>
                  <p className="font-medium text-gray-900">{selectedProject.pm_assigned}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:max-w-7xl sm:mx-auto sm:px-6 lg:px-8 sm:py-12">
        {/* Project Selector with Search and Filters */}
        {shouldShowProjectSelector && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Find Your Project</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search Input */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Projects
                </label>
                <input
                  type="text"
                  placeholder="Search by project name, client, or PM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-brand text-gray-900 placeholder-gray-500"
                />
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-brand text-gray-900"
                >
                  <option value="active">Active Projects</option>
                  <option value="completed">Completed Projects</option>
                  <option value="all">All Projects</option>
                </select>
              </div>
            </div>

            {/* Project Results */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No projects found matching your search criteria.</p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('active')
                    }}
                    className="text-blue-600 hover:text-blue-800 mt-2"
                  >
                    Clear search and show active projects
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-gray-600">
                    {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
                  </p>
                  {filteredProjects.length > 1 && (
                    <select
                      value={selectedProject?.id || ''}
                      onChange={(e) => {
                        const project = filteredProjects.find(p => p.id === e.target.value)
                        setSelectedProject(project || null)
                      }}
                      className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-900"
                    >
                      <option value="">Select a project...</option>
                      {filteredProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name} • {project.client_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                {/* Project Cards for easier selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedProject?.id === project.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm">{project.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.overall_status)}`}>
                          {project.overall_status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">Client: {project.client_name}</p>
                      <p className="text-xs text-gray-500">PM: {project.pm_assigned}</p>
                      <p className="text-xs text-gray-500">Started: {formatDate(project.start_date)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {projects.length > 0 && !selectedProject && shouldShowProjectSelector && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Select a Project</h3>
            <p className="text-blue-800">Please select a project above to view its updates and roadmap.</p>
          </div>
        )}

        {selectedProject && (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-8">
              {/* Current Report with Tesla Navigation */}
              {!snapshotsLoading && snapshots.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm mx-auto max-w-full">
                  <div className="p-3 sm:p-6 lg:p-8">
                    <div className="relative flex items-center justify-center mb-6">
                      {/* Left Arrow - Absolutely Positioned */}
                      <button
                        onClick={() => setCurrentReportIndex(Math.min(currentReportIndex + 1, snapshots.length - 1))}
                        disabled={currentReportIndex >= snapshots.length - 1}
                        className="absolute left-0 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      {/* Center Content */}
                      <div className="text-center">
                        <h2 className="text-2xl font-semibold text-gray-900">
                          {currentReportIndex === 0 ? 'Latest Update' : 'Project Update'}
                        </h2>
                        <div className="flex items-center justify-center space-x-3 mt-1">
                          <p className="text-gray-600 font-medium">{formatDateTime(snapshots[currentReportIndex].created_at).date}</p>
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <p className="text-gray-500 text-sm">{formatDateTime(snapshots[currentReportIndex].created_at).time}</p>
                        </div>
                      </div>
                      
                      {/* Right Arrow - Absolutely Positioned */}
                      <button
                        onClick={() => setCurrentReportIndex(Math.max(currentReportIndex - 1, 0))}
                        disabled={currentReportIndex <= 0}
                        className="absolute right-0 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      {/* Status Pills - Positioned Below */}
                    </div>
                    
                    <div className="flex items-center justify-end mb-6 -mt-6">
                      
                      <div className="flex items-center space-x-3">
                        {currentReportIndex === 0 && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                            Most Recent
                          </span>
                        )}
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(snapshots[currentReportIndex].overall_status)}`}>
                          {snapshots[currentReportIndex].overall_status}
                        </span>
                        
                        {/* Report Counter */}
                        {snapshots.length > 1 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                            {currentReportIndex + 1} of {snapshots.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {snapshots[currentReportIndex].tasks_data && (
                      <div className="space-y-6">
                        {/* Executive Summary */}
                        {snapshots[currentReportIndex].tasks_data.executive_summary && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Executive Summary</h3>
                            <p className="text-gray-700 text-base leading-relaxed">{snapshots[currentReportIndex].tasks_data.executive_summary}</p>
                          </div>
                        )}

                        {/* Progress Overview */}
                        {(snapshots[currentReportIndex].tasks_data.completed_tasks?.length > 0 || 
                          snapshots[currentReportIndex].tasks_data.in_progress_tasks?.length > 0 || 
                          snapshots[currentReportIndex].tasks_data.blocked_tasks?.length > 0) && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Progress This Week</h3>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-xl border border-green-100">
                                <div className="text-xl sm:text-2xl font-bold text-green-800">{snapshots[currentReportIndex].tasks_data.completed_tasks?.length || 0}</div>
                                <div className="text-xs sm:text-sm font-medium text-green-700">Completed</div>
                              </div>
                              <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="text-xl sm:text-2xl font-bold text-blue-800">{snapshots[currentReportIndex].tasks_data.in_progress_tasks?.length || 0}</div>
                                <div className="text-xs sm:text-sm font-medium text-blue-700">In Progress</div>
                              </div>
                              <div className="text-center p-3 sm:p-4 bg-red-50 rounded-xl border border-red-100 col-span-2 sm:col-span-1">
                                <div className="text-xl sm:text-2xl font-bold text-red-800">{snapshots[currentReportIndex].tasks_data.blocked_tasks?.length || 0}</div>
                                <div className="text-xs sm:text-sm font-medium text-red-700">Blocked</div>
                              </div>
                            </div>

                            {/* Task Details */}
                            {snapshots[currentReportIndex].tasks_data.completed_tasks?.length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-medium text-green-800 mb-3 flex items-center">
                                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                  Completed This Week
                                </h4>
                                <div className="space-y-2">
                                  {snapshots[currentReportIndex].tasks_data.completed_tasks.slice(0, 3).map((task: any, index: number) => (
                                    <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg border border-green-100">
                                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900">{task.name}</p>
                                        {task.category && <p className="text-sm text-gray-500">{task.category}</p>}
                                        {task.notes && <p className="text-sm text-gray-600 mt-1 italic">"{task.notes}"</p>}
                                      </div>
                                    </div>
                                  ))}
                                  {snapshots[currentReportIndex].tasks_data.completed_tasks.length > 3 && (
                                    <p className="text-sm text-gray-500 text-center">
                                      +{snapshots[currentReportIndex].tasks_data.completed_tasks.length - 3} more completed
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Next Steps */}
                            {snapshots[currentReportIndex].tasks_data.in_progress_tasks?.length > 0 && (
                              <div>
                                <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                  Currently Working On
                                </h4>
                                <div className="space-y-2">
                                  {snapshots[currentReportIndex].tasks_data.in_progress_tasks.slice(0, 2).map((task: any, index: number) => (
                                    <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900">{task.name}</p>
                                        {task.category && <p className="text-sm text-gray-500">{task.category}</p>}
                                        {task.notes && <p className="text-sm text-gray-600 mt-1 italic">"{task.notes}"</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Key Information */}
                        {(snapshots[currentReportIndex].tasks_data.upcoming_milestones || snapshots[currentReportIndex].tasks_data.next_steps) && (
                          <div className="grid md:grid-cols-2 gap-6">
                            {snapshots[currentReportIndex].tasks_data.upcoming_milestones && (
                              <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Upcoming Milestones</h3>
                                <p className="text-gray-700 leading-relaxed">{snapshots[currentReportIndex].tasks_data.upcoming_milestones}</p>
                              </div>
                            )}
                            {snapshots[currentReportIndex].tasks_data.next_steps && (
                              <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Next Steps</h3>
                                <p className="text-gray-700 leading-relaxed">{snapshots[currentReportIndex].tasks_data.next_steps}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Risks/Blockers if any */}
                        {snapshots[currentReportIndex].tasks_data.risks_and_blockers && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h3 className="text-lg font-medium text-amber-800 mb-2 flex items-center">
                              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Attention Needed
                            </h3>
                            <p className="text-amber-800 leading-relaxed">{snapshots[currentReportIndex].tasks_data.risks_and_blockers}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Tesla-Style Timeline Scrubber */}
                  {snapshots.length > 1 && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-700 flex-shrink-0">Timeline:</span>
                        <div className="flex-1 relative">
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-gray-700 rounded-full transition-all duration-300"
                              style={{ width: `${((snapshots.length - currentReportIndex - 1) / (snapshots.length - 1)) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>Oldest</span>
                            <span>Newest</span>
                          </div>
                          {/* Interactive dots */}
                          <div className="absolute top-0 left-0 w-full h-2 flex justify-between">
                            {snapshots.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentReportIndex(index)}
                                className={`w-4 h-4 rounded-full -mt-1 transition-colors cursor-pointer ${
                                  index === currentReportIndex 
                                    ? 'bg-gray-700 ring-2 ring-gray-300' 
                                    : 'bg-gray-400 hover:bg-gray-500'
                                }`}
                                title={`${formatDateTime(snapshots[index].created_at).date} at ${formatDateTime(snapshots[index].created_at).time}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* No Updates State */}
              {!snapshotsLoading && snapshots.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Updates Yet</h3>
                    <p className="text-gray-500">Your project manager will share the first update soon.</p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {snapshotsLoading && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading your updates...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6 mt-6 lg:mt-0">
              {/* Project Overview Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h3>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-900">Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedProject.overall_status)}`}>
                      {selectedProject.overall_status}
                    </span>
                  </div>

                  {selectedProject.overall_summary && (
                    <div className="mb-4">
                      <p className="text-gray-700 text-sm leading-relaxed">{selectedProject.overall_summary}</p>
                    </div>
                  )}

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Started</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedProject.start_date)}</span>
                    </div>
                    {selectedProject.end_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Target End</span>
                        <span className="font-medium text-gray-900">{formatDate(selectedProject.end_date)}</span>
                      </div>
                    )}
                    {selectedProject.team_members && selectedProject.team_members.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-gray-500 text-sm">Team Members</span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedProject.team_members.map((member, index) => (
                            <span key={index} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                              {member}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* Support */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Have questions about your project? Reach out to your project manager.
                  </p>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-semibold text-sm">
                        {selectedProject.pm_assigned.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{selectedProject.pm_assigned}</p>
                      <p className="text-xs text-gray-500">Project Manager</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default function ClientPortal() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientPortalContent />
    </Suspense>
  )
}