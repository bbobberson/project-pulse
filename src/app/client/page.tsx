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

  useEffect(() => {
    validateTokenAndFetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchSnapshots(selectedProject.id)
    }
  }, [selectedProject])

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
        // Remove duplicates - keep only the latest snapshot per week
        const uniqueSnapshots = (data || []).reduce((acc: any[], snapshot) => {
          const weekKey = snapshot.week_number || snapshot.week_start_date
          const existingWeek = acc.find(s => 
            (s.week_number && s.week_number === snapshot.week_number) ||
            (s.week_start_date === snapshot.week_start_date)
          )
          if (!existingWeek) {
            acc.push(snapshot)
          }
          return acc
        }, [])
        
        // Sort by most recent and limit to last 5 updates
        const recentSnapshots = uniqueSnapshots
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
        
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
          <div className="max-w-6xl mx-auto px-8">
            <div className="flex justify-between items-center py-8">
              <div className="flex items-center space-x-8">
                <InfoWorksLogo width={120} height={36} />
                <div>
                  <h1 className="text-3xl font-light text-gray-900">Project Pulse</h1>
                  <p className="text-gray-400 text-sm mt-1">Client Portal</p>
                </div>
              </div>
              <a 
                href="/"
                className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-24">
          <div className="text-center">
            {isNoToken ? (
              <div>
                <div className="w-16 h-16 mx-auto mb-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
                </div>
                <h2 className="text-5xl font-extralight text-gray-900 mb-6">Project Portal</h2>
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
              <a 
                href="/"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Home
              </a>
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
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Modal for First-Time Users */}
      {selectedProject && (
        <ClientWelcomeModal 
          projectName={selectedProject.name}
          clientName={selectedProject.client_name}
          pmName={selectedProject.pm_assigned}
        />
      )}
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <InfoWorksLogo width={100} height={32} />
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-2xl font-bold text-gray-900">Project Pulse</h1>
                <p className="text-gray-600">Client Portal</p>
              </div>
              {clientName && (
                <div className="border-l border-gray-300 pl-4">
                  <p className="text-sm font-medium text-gray-900">Welcome, {clientName}!</p>
                  <p className="text-xs text-gray-500">Access your project updates below</p>
                </div>
              )}
            </div>
            <a 
              href="/"
              className="text-gray-600 hover:text-gray-900 px-4 py-2 border border-gray-300 rounded-lg"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
          <div className="space-y-6">
            {/* Project Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                  <p className="text-gray-600">Client: {selectedProject.client_name}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => router.push(`/client/${selectedProject.id}/roadmap?token=${tokenData?.token}`)}
                    style={{ backgroundColor: '#1C2B45' }}
                    className="text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                  >
                    📋 View Project Roadmap
                  </button>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedProject.overall_status)}`}>
                    {selectedProject.overall_status}
                  </span>
                </div>
              </div>

              {selectedProject.overall_summary && (
                <p className="text-gray-700 mb-4">{selectedProject.overall_summary}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Project Manager:</span>
                  <span className="ml-2 text-gray-600">{selectedProject.pm_assigned}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Start Date:</span>
                  <span className="ml-2 text-gray-600">{formatDate(selectedProject.start_date)}</span>
                </div>
                {selectedProject.end_date && (
                  <div>
                    <span className="font-medium text-gray-900">End Date:</span>
                    <span className="ml-2 text-gray-600">{formatDate(selectedProject.end_date)}</span>
                  </div>
                )}
                {selectedProject.team_members && selectedProject.team_members.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-900">Team:</span>
                    <span className="ml-2 text-gray-600">{selectedProject.team_members.join(', ')}</span>
                  </div>
                )}
              </div>

              {selectedProject.onedrive_link && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <a
                    href={selectedProject.onedrive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    📁 Access Project Files
                  </a>
                </div>
              )}
            </div>

            {/* Project Updates */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Project Updates</h3>
              
              {snapshotsLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading updates...</div>
                </div>
              ) : snapshots.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No updates available yet.</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {snapshots.map((snapshot) => (
                    <div key={snapshot.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {snapshot.tasks_data?.week_number ? 
                              `Week ${snapshot.tasks_data.week_number} Update` : 
                              `Update - ${formatDate(snapshot.week_start_date)}`
                            }
                          </h4>
                          <p className="text-sm text-gray-500">
                            Updated {formatDate(snapshot.created_at)} by {snapshot.created_by}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {snapshots.indexOf(snapshot) === 0 && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              Latest
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(snapshot.overall_status)}`}>
                            {snapshot.overall_status}
                          </span>
                        </div>
                      </div>

                      {snapshot.tasks_data && (
                        <div className="space-y-4">
                          {/* Executive Summary */}
                          {snapshot.tasks_data.executive_summary && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Executive Summary</h5>
                              <p className="text-gray-700">{snapshot.tasks_data.executive_summary}</p>
                            </div>
                          )}

                          {/* Task Progress - New Structured Format */}
                          {(snapshot.tasks_data.completed_tasks?.length > 0 || 
                            snapshot.tasks_data.in_progress_tasks?.length > 0 || 
                            snapshot.tasks_data.blocked_tasks?.length > 0) && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-3">Task Progress</h5>
                              
                              {/* Completed Tasks */}
                              {snapshot.tasks_data.completed_tasks?.length > 0 && (
                                <div className="mb-3">
                                  <h6 className="text-sm font-medium text-green-800 mb-2">✅ Completed ({snapshot.tasks_data.completed_tasks.length})</h6>
                                  <div className="space-y-1">
                                    {snapshot.tasks_data.completed_tasks.map((task: any, index: number) => (
                                      <div key={index} className="text-sm text-gray-700 pl-4">
                                        <span className="font-medium">{task.name}</span>
                                        {task.category && <span className="text-gray-500 ml-2">({task.category})</span>}
                                        {task.notes && <p className="text-gray-600 italic ml-2">{task.notes}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* In Progress Tasks */}
                              {snapshot.tasks_data.in_progress_tasks?.length > 0 && (
                                <div className="mb-3">
                                  <h6 className="text-sm font-medium text-blue-800 mb-2">🔄 In Progress ({snapshot.tasks_data.in_progress_tasks.length})</h6>
                                  <div className="space-y-1">
                                    {snapshot.tasks_data.in_progress_tasks.map((task: any, index: number) => (
                                      <div key={index} className="text-sm text-gray-700 pl-4">
                                        <span className="font-medium">{task.name}</span>
                                        {task.category && <span className="text-gray-500 ml-2">({task.category})</span>}
                                        {task.notes && <p className="text-gray-600 italic ml-2">{task.notes}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Blocked Tasks */}
                              {snapshot.tasks_data.blocked_tasks?.length > 0 && (
                                <div className="mb-3">
                                  <h6 className="text-sm font-medium text-red-800 mb-2">🚫 Blocked ({snapshot.tasks_data.blocked_tasks.length})</h6>
                                  <div className="space-y-1">
                                    {snapshot.tasks_data.blocked_tasks.map((task: any, index: number) => (
                                      <div key={index} className="text-sm text-gray-700 pl-4">
                                        <span className="font-medium">{task.name}</span>
                                        {task.category && <span className="text-gray-500 ml-2">({task.category})</span>}
                                        {task.notes && <p className="text-gray-600 italic ml-2">{task.notes}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Legacy Format Support */}
                          {snapshot.tasks_data.key_accomplishments && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Key Accomplishments</h5>
                              <p className="text-gray-700 whitespace-pre-line">{snapshot.tasks_data.key_accomplishments}</p>
                            </div>
                          )}

                          {snapshot.tasks_data.upcoming_milestones && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Upcoming Milestones</h5>
                              <p className="text-gray-700 whitespace-pre-line">{snapshot.tasks_data.upcoming_milestones}</p>
                            </div>
                          )}

                          {(snapshot.tasks_data.budget_status || snapshot.tasks_data.timeline_status) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {snapshot.tasks_data.budget_status && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-1">Budget Status</h5>
                                  <p className="text-gray-700">{snapshot.tasks_data.budget_status}</p>
                                </div>
                              )}
                              {snapshot.tasks_data.timeline_status && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-1">Timeline Status</h5>
                                  <p className="text-gray-700">{snapshot.tasks_data.timeline_status}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {snapshot.tasks_data.risks_and_blockers && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Risks & Blockers</h5>
                              <p className="text-gray-700 whitespace-pre-line">{snapshot.tasks_data.risks_and_blockers}</p>
                            </div>
                          )}

                          {snapshot.tasks_data.next_steps && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Next Steps</h5>
                              <p className="text-gray-700 whitespace-pre-line">{snapshot.tasks_data.next_steps}</p>
                            </div>
                          )}

                          {snapshot.tasks_data.client_feedback && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Client Feedback</h5>
                              <p className="text-gray-700">{snapshot.tasks_data.client_feedback}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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