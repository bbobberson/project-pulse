'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

interface Project {
  id: string
  name: string
  client_name: string
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

interface TaskUpdate {
  taskId: string
  status: string
  notes: string
  actual_hours?: number
}

export default function UpdatePulse() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [currentWeekTasks, setCurrentWeekTasks] = useState<RoadmapTask[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [taskUpdates, setTaskUpdates] = useState<Record<string, TaskUpdate>>({})
  const [overallStatus, setOverallStatus] = useState('')
  const [executiveSummary, setExecutiveSummary] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, client_name, overall_status')
          .eq('id', projectId)
          .single()
        
        if (projectError) {
          console.error('Error fetching project:', projectError)
          router.push('/dashboard')
          return
        }

        setProject(projectData)
        setOverallStatus(projectData.overall_status || 'on-track')

        // Calculate current week (simplified - just use week 1 for now)
        // TODO: Calculate based on project start date
        const weekToShow = 1
        setCurrentWeek(weekToShow)

        // Fetch current week's tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('project_roadmap')
          .select(`
            *,
            task_template:task_templates(name, category)
          `)
          .eq('project_id', projectId)
          .lte('planned_start_week', weekToShow)
          .gte('planned_end_week', weekToShow)
          .order('planned_start_week', { ascending: true })

        if (tasksError) {
          console.error('Error fetching tasks:', tasksError)
        } else {
          setCurrentWeekTasks(tasksData || [])
          
          // Initialize task updates with current status
          const updates: Record<string, TaskUpdate> = {}
          tasksData?.forEach(task => {
            updates[task.id] = {
              taskId: task.id,
              status: task.status,
              notes: task.notes || ''
            }
          })
          setTaskUpdates(updates)
        }

      } catch (err) {
        console.error('Error:', err)
        router.push('/dashboard')
      } finally {
        setFetchingData(false)
      }
    }

    if (projectId) {
      fetchData()
    }
  }, [projectId, router])

  const updateTaskStatus = (taskId: string, field: keyof TaskUpdate, value: string) => {
    setTaskUpdates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'blocked':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Update project overall status
      const { error: projectError } = await supabase
        .from('projects')
        .update({ overall_status: overallStatus })
        .eq('id', projectId)

      if (projectError) {
        console.error('Error updating project:', projectError)
        alert('Error updating project. Please try again.')
        return
      }

      // Update individual tasks
      const taskUpdatePromises = Object.values(taskUpdates).map(async (update) => {
        return supabase
          .from('project_roadmap')
          .update({
            status: update.status,
            notes: update.notes || null,
            actual_hours: update.actual_hours || null
          })
          .eq('id', update.taskId)
      })

      const taskResults = await Promise.all(taskUpdatePromises)
      const hasTaskErrors = taskResults.some(result => result.error)

      if (hasTaskErrors) {
        console.error('Error updating some tasks')
        alert('Error updating some tasks. Please try again.')
        return
      }

      // Generate task summary for snapshot
      const completedTasks = currentWeekTasks.filter(task => 
        taskUpdates[task.id]?.status === 'completed'
      )
      const inProgressTasks = currentWeekTasks.filter(task => 
        taskUpdates[task.id]?.status === 'in-progress'
      )
      const blockedTasks = currentWeekTasks.filter(task => 
        taskUpdates[task.id]?.status === 'blocked'
      )

      const taskSummary = {
        week_number: currentWeek,
        completed_tasks: completedTasks.map(task => ({
          name: task.custom_task_name || task.task_template?.name,
          category: task.task_template?.category,
          notes: taskUpdates[task.id]?.notes
        })),
        in_progress_tasks: inProgressTasks.map(task => ({
          name: task.custom_task_name || task.task_template?.name,
          category: task.task_template?.category,
          notes: taskUpdates[task.id]?.notes
        })),
        blocked_tasks: blockedTasks.map(task => ({
          name: task.custom_task_name || task.task_template?.name,
          category: task.task_template?.category,
          notes: taskUpdates[task.id]?.notes
        })),
        executive_summary: executiveSummary
      }

      // Check if weekly snapshot already exists for this week
      const { data: existingSnapshot } = await supabase
        .from('weekly_snapshots')
        .select('id')
        .eq('project_id', projectId)
        .eq('week_number', currentWeek)
        .single()

      let snapshotError = null

      if (existingSnapshot) {
        // Update existing snapshot
        const { error } = await supabase
          .from('weekly_snapshots')
          .update({
            tasks_data: taskSummary,
            overall_status: overallStatus,
            status: overallStatus,
            created_by: 'PM User'
          })
          .eq('id', existingSnapshot.id)
        snapshotError = error
      } else {
        // Create new snapshot
        const { error } = await supabase
          .from('weekly_snapshots')
          .insert([{
            project_id: projectId,
            week_number: currentWeek,
            week_start_date: new Date().toISOString().split('T')[0],
            tasks_data: taskSummary,
            overall_status: overallStatus,
            status: overallStatus,
            created_by: 'PM User'
          }])
        snapshotError = error
      }

      if (snapshotError) {
        console.error('Error creating snapshot:', snapshotError)
        alert(`Error creating pulse update: ${snapshotError.message}. Please try again.`)
      } else {
        console.log('Pulse update created successfully')
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error creating pulse update. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading project and tasks...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project not found</h2>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafafa' }}>
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-8">
          <div className="flex items-center py-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-gray-600 mr-8 font-medium transition-colors"
            >
              ← Dashboard
            </button>
            <div>
              <h1 className="text-3xl font-light text-gray-900">Update Pulse</h1>
              <p className="text-gray-500 mt-1">{project.name} • Week {currentWeek}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Overall Status */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8">
            <h2 className="text-xl font-medium text-gray-900 mb-6">Project Status</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'on-track', label: 'On Track' },
                { value: 'at-risk', label: 'At Risk' },
                { value: 'off-track', label: 'Off Track' }
              ].map((status) => (
                <label key={status.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={status.value}
                    checked={overallStatus === status.value}
                    onChange={(e) => setOverallStatus(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`p-4 rounded-2xl border-2 transition-all text-center ${
                    overallStatus === status.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className={`w-3 h-3 rounded-full mx-auto mb-3 ${
                      overallStatus === status.value
                        ? 'bg-gray-900'
                        : 'bg-gray-300'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900">{status.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8">
            <h2 className="text-xl font-medium text-gray-900 mb-6">Executive Summary</h2>
            <textarea
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              rows={4}
              className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all text-gray-900 placeholder-gray-400 resize-none"
              placeholder="Brief overview of this week's progress and key highlights..."
            />
          </div>

          {/* Tasks for This Week */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-gray-900">
                Week {currentWeek} Tasks
              </h2>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/${projectId}/roadmap`)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors rounded-xl"
              >
                Manage Roadmap
              </button>
            </div>
            
            {currentWeekTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">No tasks planned for this week</p>
                <p className="text-gray-400 text-sm mb-6">Add tasks to your roadmap or move existing tasks to Week {currentWeek}</p>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/${projectId}/roadmap`)}
                  className="px-6 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium rounded-2xl transition-colors"
                >
                  Manage Roadmap
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                  <p className="text-sm text-gray-600">
                    Update task status and add progress notes. Need to add or move tasks? Use &quot;Manage Roadmap&quot; above.
                  </p>
                </div>
                <div className="space-y-6">
                  {currentWeekTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-2xl border p-6 ${
                      task.is_milestone 
                        ? 'border-gray-200 bg-gray-50' 
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-start space-x-3">
                        {task.is_milestone && (
                          <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900 mb-1">
                            {task.custom_task_name || task.task_template?.name}
                          </h3>
                          {task.task_template && (
                            <p className="text-xs text-gray-400 uppercase tracking-wider">{task.task_template.category}</p>
                          )}
                          {task.assigned_to && (
                            <p className="text-sm text-gray-500 mt-1">{task.assigned_to}</p>
                          )}
                        </div>
                      </div>
                      {task.estimated_hours && (
                        <span className="text-xs text-gray-400 font-medium">{task.estimated_hours}h</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                          Status
                        </label>
                        <select
                          value={taskUpdates[task.id]?.status || task.status}
                          onChange={(e) => updateTaskStatus(task.id, 'status', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all text-gray-900 font-medium"
                        >
                          <option value="not-started">Not Started</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={taskUpdates[task.id]?.notes || ''}
                          onChange={(e) => updateTaskStatus(task.id, 'notes', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                          placeholder="Progress notes..."
                        />
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-8 py-4 text-gray-500 hover:text-gray-700 font-medium transition-colors rounded-2xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#1C2B45' }}
              className="px-8 py-4 text-white font-medium rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}