'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase-browser'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Project {
  id: string
  name: string
  client_name: string
  start_date: string
  end_date: string | null
}

interface TaskTemplate {
  id: string
  name: string
  category: string
  estimated_hours: number
  description: string
  is_custom: boolean
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
  task_template?: TaskTemplate
}

// Draggable Task Template Component
function DraggableTaskTemplate({ template }: { template: TaskTemplate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `template-${template.id}`,
    data: {
      type: 'template',
      template,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 bg-white border border-gray-200 rounded-xl cursor-grab hover:bg-gray-50 hover:border-gray-300 transition-all hover:shadow-sm"
    >
      <div className="font-medium text-sm text-gray-900">{template.name}</div>
      <div className="text-xs text-gray-500 mt-1">{template.estimated_hours}h • {template.category}</div>
    </div>
  )
}

// Droppable Week Column Component
function WeekColumn({ 
  weekNumber, 
  tasks, 
  onUpdateTaskStatus, 
  onDeleteTask 
}: { 
  weekNumber: number
  tasks: RoadmapTask[]
  onUpdateTaskStatus: (taskId: string, status: string) => void
  onDeleteTask: (taskId: string) => void
}) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: `week-${weekNumber}`,
    data: {
      type: 'week',
      weekNumber,
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      case 'blocked':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[300px] p-6 bg-gray-50 rounded-2xl border-2 border-dashed transition-all ${
        isOver 
          ? 'border-blue-400 bg-blue-50 shadow-lg' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <h3 className="font-semibold text-gray-900 mb-3">Week {weekNumber}</h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 bg-white rounded-xl border shadow-sm transition-all hover:shadow-md ${
              task.is_milestone ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                {task.is_milestone && (
                  <span className="mr-2 text-blue-600">🏁</span>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {task.custom_task_name || task.task_template?.name}
                  </div>
                  {task.task_template && (
                    <div className="text-xs text-gray-500">
                      {task.task_template.category}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDeleteTask(task.id)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <select
                value={task.status}
                onChange={(e) => onUpdateTaskStatus(task.id, e.target.value)}
                className={`text-xs px-3 py-2 rounded-xl border-0 font-medium cursor-pointer transition-all hover:shadow-sm ${getStatusColor(task.status)}`}
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              {task.estimated_hours && (
                <span className="text-xs text-gray-500">{task.estimated_hours}h</span>
              )}
            </div>
            
            {task.assigned_to && (
              <div className="text-xs text-gray-600 mt-1">
                Assigned: {task.assigned_to}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProjectRoadmap() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.projectId as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([])
  const [roadmapTasks, setRoadmapTasks] = useState<RoadmapTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedTemplate, setDraggedTemplate] = useState<TaskTemplate | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    dangerous: false,
    onConfirm: () => {},
    onCancel: () => {}
  })

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    fetchProject()
    fetchTaskTemplates()
    fetchRoadmapTasks()
  }, [projectId])

  // Initialize all categories as collapsed when task templates are loaded
  useEffect(() => {
    if (taskTemplates.length > 0) {
      const allCategories = new Set(taskTemplates.map(template => template.category))
      setCollapsedCategories(allCategories)
    }
  }, [taskTemplates])

  async function fetchProject() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name, start_date, end_date')
        .eq('id', projectId)
        .single()
      
      if (error) {
        console.error('Error fetching project:', error)
        router.push('/dashboard')
      } else {
        setProject(data)
      }
    } catch (err) {
      console.error('Error:', err)
      router.push('/dashboard')
    }
  }

  async function fetchTaskTemplates() {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Error fetching task templates:', error)
      } else {
        setTaskTemplates(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function fetchRoadmapTasks() {
    try {
      const { data, error } = await supabase
        .from('project_roadmap')
        .select(`
          *,
          task_template:task_templates(*)
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

  async function addTaskToWeek(template: TaskTemplate, weekNumber: number) {
    try {
      const taskData = {
        project_id: projectId,
        task_template_id: template.id,
        custom_task_name: null,
        planned_start_week: weekNumber,
        planned_end_week: weekNumber,
        assigned_to: null,
        estimated_hours: template.estimated_hours,
        is_milestone: false,
        status: 'not-started'
      }

      const { error } = await supabase
        .from('project_roadmap')
        .insert([taskData])

      if (error) {
        console.error('Error adding task:', error)
        alert('Error adding task. Please try again.')
      } else {
        fetchRoadmapTasks()
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error adding task. Please try again.')
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    try {
      const { error } = await supabase
        .from('project_roadmap')
        .update({ status })
        .eq('id', taskId)

      if (error) {
        console.error('Error updating task status:', error)
      } else {
        fetchRoadmapTasks()
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function deleteTask(taskId: string) {
    // Find the task to get its name
    const task = roadmapTasks.find(t => t.id === taskId)
    const taskName = task?.custom_task_name || task?.task_template?.name || 'this task'

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Task',
      message: `Are you sure you want to delete "${taskName}"? This action cannot be undone.`,
      confirmText: 'Yes, Delete',
      dangerous: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('project_roadmap')
            .delete()
            .eq('id', taskId)

          if (error) {
            console.error('Error deleting task:', error)
          } else {
            fetchRoadmapTasks()
          }
        } catch (err) {
          console.error('Error:', err)
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false })
      },
      onCancel: () => setConfirmDialog({ ...confirmDialog, isOpen: false })
    })
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    setActiveId(active.id as string)
    
    if (active.data.current?.type === 'template') {
      setDraggedTemplate(active.data.current.template)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    
    if (!over) return

    if (active.data.current?.type === 'template' && over.data.current?.type === 'week') {
      const template = active.data.current.template
      const weekNumber = over.data.current.weekNumber
      addTaskToWeek(template, weekNumber)
    }

    setActiveId(null)
    setDraggedTemplate(null)
  }

  // Group tasks by week
  const tasksByWeek = roadmapTasks.reduce((acc, task) => {
    const week = task.planned_start_week
    if (!acc[week]) acc[week] = []
    acc[week].push(task)
    return acc
  }, {} as Record<number, RoadmapTask[]>)

  // Filter templates by search query
  const filteredTemplates = taskTemplates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group filtered templates by category
  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = []
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, TaskTemplate[]>)

  // Toggle category collapse
  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories)
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category)
    } else {
      newCollapsed.add(category)
    }
    setCollapsedCategories(newCollapsed)
  }

  // Calculate weeks based on project duration
  const calculateProjectWeeks = () => {
    if (!project?.start_date || !project?.end_date) {
      // Fallback to 12 weeks if dates aren't available
      return 12
    }
    
    const startDate = new Date(project.start_date)
    const endDate = new Date(project.end_date)
    const diffInMs = endDate.getTime() - startDate.getTime()
    const diffInWeeks = Math.ceil(diffInMs / (1000 * 60 * 60 * 24 * 7))
    
    // Ensure at least 4 weeks and at most 52 weeks
    return Math.max(4, Math.min(52, diffInWeeks))
  }
  
  const projectWeeks = calculateProjectWeeks()
  const maxWeek = Math.max(projectWeeks, ...Object.keys(tasksByWeek).map(Number))
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading project roadmap...</div>
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
            className="text-blue-600 hover:underline cursor-pointer"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-6">
                <motion.button
                  onClick={() => router.push(`/dashboard/${projectId}`)}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Project Details
                </motion.button>
                <div className="h-6 w-px bg-gray-300" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Project Roadmap</h1>
                  <p className="text-gray-600 mt-1">{project.name} • {project.client_name}</p>
                </div>
              </div>
              <div className="flex items-center">
                <InfoWorksLogo width={120} height={36} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-140px)]">
          {/* Task Library Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Library</h2>
            
            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 text-sm transition-all"
              />
            </div>
            
            {Object.entries(templatesByCategory).map(([category, templates]) => {
              const isCollapsed = collapsedCategories.has(category)
              return (
                <div key={category} className="mb-4">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-xl transition-all"
                  >
                    <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                      {category} <span className="text-gray-500 font-normal">({templates.length})</span>
                    </h3>
                    <div className={`transform transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                  
                  {!isCollapsed && (
                    <SortableContext 
                      items={templates.map(t => `template-${t.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 mt-3 ml-2">
                        {templates.map((template) => (
                          <DraggableTaskTemplate key={template.id} template={template} />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              )
            })}
          </div>

          {/* Timeline */}
          <div className="flex-1 p-6 overflow-x-auto">
            <div className="mb-4">
              <p className="text-sm text-gray-600 font-medium">
                Drag tasks from library to timeline →
              </p>
            </div>
            <div className="flex space-x-6 min-w-max">
              {weeks.map((weekNumber) => (
                <div key={weekNumber} className="w-64 flex-shrink-0">
                  <SortableContext items={[`week-${weekNumber}`]} strategy={verticalListSortingStrategy}>
                    <WeekColumn
                      weekNumber={weekNumber}
                      tasks={tasksByWeek[weekNumber] || []}
                      onUpdateTaskStatus={updateTaskStatus}
                      onDeleteTask={deleteTask}
                    />
                  </SortableContext>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedTemplate ? (
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xl">
              <div className="font-medium text-sm text-gray-900">{draggedTemplate.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {draggedTemplate.estimated_hours}h • {draggedTemplate.category}
              </div>
            </div>
          ) : null}
        </DragOverlay>

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
    </DndContext>
  )
}