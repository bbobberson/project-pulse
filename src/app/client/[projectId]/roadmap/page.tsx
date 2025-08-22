'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

interface Project {
  id: string
  name: string
  client_name: string
  start_date: string
  end_date: string | null
  pm_assigned: string
  overall_status: string
}

interface RoadmapTask {
  id: string
  task_template_id: string | null
  custom_task_name: string | null
  planned_start_week: number
  planned_end_week: number
  status: string
  assigned_to: string | null
  notes: string | null
  estimated_hours: number | null
  is_milestone: boolean
  task_template?: {
    name: string
    category: string
  }
}

export default function ClientRoadmap() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [roadmapTasks, setRoadmapTasks] = useState<RoadmapTask[]>([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    validateTokenAndFetchData()
  }, [projectId])

  async function validateTokenAndFetchData() {
    try {
      const token = searchParams.get('token')
      
      if (!token) {
        setAuthError('Access token is required. Please use the link provided by your project manager.')
        setLoading(false)
        return
      }

      // Validate token using our API endpoint
      const tokenResponse = await fetch('/api/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const tokenData = await tokenResponse.json()

      if (!tokenResponse.ok || !tokenData.success) {
        setAuthError(tokenData.error || 'Invalid or expired access token. Please contact your project manager for a new link.')
        setLoading(false)
        return
      }

      // Check if token is for this specific project
      if (tokenData.tokenData.projectId !== projectId) {
        setAuthError('Access denied. This token does not grant access to this project.')
        setLoading(false)
        return
      }

      // Use the project data from the token validation
      setProject(tokenData.project)
      
      // Fetch roadmap tasks
      await fetchRoadmapTasks()
      
    } catch (err) {
      console.error('Error:', err)
      setAuthError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  async function fetchRoadmapTasks() {
    try {
      const { data, error } = await supabase
        .from('project_roadmap')
        .select(`
          *,
          task_template:task_templates(name, category)
        `)
        .eq('project_id', projectId)
        .order('planned_start_week', { ascending: true })
      
      if (error) {
        console.error('Error fetching roadmap tasks:', error)
      } else {
        setRoadmapTasks(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading project roadmap...</div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-red-600 text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Required</h2>
            <p className="text-gray-600 mb-6">{authError}</p>
            <div className="text-sm text-gray-500">
              <p>Need access? Contact your project manager to get a secure link to your project updates.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project not found</h2>
          <button 
            onClick={() => router.push(`/client?token=${searchParams.get('token')}`)}
            className="text-blue-600 hover:underline"
          >
            ← Back to Client Portal
          </button>
        </div>
      </div>
    )
  }

  // Group tasks by week
  const tasksByWeek = roadmapTasks.reduce((acc, task) => {
    const week = task.planned_start_week
    if (!acc[week]) acc[week] = []
    acc[week].push(task)
    return acc
  }, {} as Record<number, RoadmapTask[]>)

  // Sort weeks and show up to 12 weeks
  const sortedWeeks = Object.keys(tasksByWeek)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 12)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Project Roadmap</h1>
              <p className="text-gray-600">{project.name} • {project.client_name}</p>
            </div>
            <button 
              onClick={() => router.push(`/client?token=${searchParams.get('token')}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Updates
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {roadmapTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No roadmap available</h3>
            <p className="text-gray-600">The project manager hasn't created a roadmap yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Project Timeline Overview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {roadmapTasks.filter(task => task.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">✅ Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {roadmapTasks.filter(task => task.status === 'in-progress').length}
                  </div>
                  <div className="text-sm text-gray-600">🔄 In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {roadmapTasks.filter(task => task.status === 'not-started').length}
                  </div>
                  <div className="text-sm text-gray-600">📋 Upcoming</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {roadmapTasks.filter(task => task.status === 'blocked').length}
                  </div>
                  <div className="text-sm text-gray-600">🚫 Blocked</div>
                </div>
              </div>
            </div>

            {/* Week-by-week breakdown */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Weekly Timeline</h2>
              {sortedWeeks.map(weekNumber => (
                <div key={weekNumber} className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    Week {weekNumber}
                    {weekNumber === 1 && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Current Week
                      </span>
                    )}
                  </h3>
                  
                  <div className="space-y-3">
                    {tasksByWeek[weekNumber].map((task) => (
                      <div key={task.id} className={`p-4 rounded-lg border ${
                        task.is_milestone ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            {task.is_milestone && (
                              <span className="mr-3 text-blue-600 mt-1">🏁</span>
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">
                                {task.custom_task_name || task.task_template?.name}
                              </div>
                              {task.task_template && (
                                <div className="text-sm text-gray-500 mb-2">
                                  {task.task_template.category}
                                </div>
                              )}
                              {task.assigned_to && (
                                <div className="text-sm text-gray-600 mb-2">
                                  Assigned to: {task.assigned_to}
                                </div>
                              )}
                              {task.notes && (
                                <div className="text-sm text-gray-600 italic">
                                  {task.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 ml-4">
                            {task.estimated_hours && (
                              <span className="text-sm text-gray-500 whitespace-nowrap">
                                {task.estimated_hours}h
                              </span>
                            )}
                            <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                              task.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : task.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-800'
                                : task.status === 'blocked'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status === 'not-started' ? 'Planned' : 
                               task.status === 'in-progress' ? 'In Progress' :
                               task.status === 'completed' ? 'Completed' :
                               task.status === 'blocked' ? 'Blocked' :
                               task.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}