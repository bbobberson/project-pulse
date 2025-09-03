'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase-browser'
import InfoWorksLogo from '@/components/InfoWorksLogo'

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
  const projectId = params?.projectId as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [roadmapTasks, setRoadmapTasks] = useState<RoadmapTask[]>([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set())
  const [initialCollapse, setInitialCollapse] = useState(false)
  const [weeklySnapshots, setWeeklySnapshots] = useState<any[]>([])

  useEffect(() => {
    validateTokenAndFetchData()
  }, [projectId])

  // Set initial collapse state: expand only current week
  useEffect(() => {
    if (project && roadmapTasks.length > 0 && !initialCollapse) {
      const currentWeek = getCurrentWeek()
      const tasksByWeek = roadmapTasks.reduce((acc, task) => {
        const week = task.planned_start_week
        if (!acc[week]) acc[week] = []
        acc[week].push(task)
        return acc
      }, {} as Record<number, RoadmapTask[]>)
      
      const allWeeks = Object.keys(tasksByWeek).map(Number)
      const weeksToCollapse = allWeeks.filter(week => week !== currentWeek)
      
      setCollapsedWeeks(new Set(weeksToCollapse))
      setInitialCollapse(true)
    }
  }, [project, roadmapTasks, initialCollapse])

  async function validateTokenAndFetchData() {
    try {
      const token = searchParams?.get('token')
      
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
      
      // Fetch roadmap tasks and weekly snapshots
      await Promise.all([
        fetchRoadmapTasks(),
        fetchWeeklySnapshots()
      ])
      
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
    }
  }

  async function fetchWeeklySnapshots() {
    try {
      const { data, error } = await supabase
        .from('weekly_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5) // Get last 5 updates
      
      if (error) {
        console.error('Error fetching snapshots:', error)
      } else {
        setWeeklySnapshots(data || [])
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

  const toggleWeekCollapse = (weekNumber: number) => {
    const newCollapsed = new Set(collapsedWeeks)
    if (newCollapsed.has(weekNumber)) {
      newCollapsed.delete(weekNumber)
    } else {
      newCollapsed.add(weekNumber)
    }
    setCollapsedWeeks(newCollapsed)
  }

  const getCurrentWeek = () => {
    if (!project?.start_date) return 1
    const startDate = new Date(project.start_date)
    const now = new Date()
    const diffInMs = now.getTime() - startDate.getTime()
    const diffInWeeks = Math.ceil(diffInMs / (1000 * 60 * 60 * 24 * 7))
    return Math.max(1, diffInWeeks)
  }

  const downloadRoadmap = async () => {
    if (!project) return
    
    try {
      const { default: jsPDF } = await import('jspdf')
      
      // Tesla-inspired PDF with professional styling
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.width
      const pageHeight = pdf.internal.pageSize.height
      const margin = 20
      const contentWidth = pageWidth - 2 * margin
      let yPosition = margin
      
      // Brand color palette - Tesla inspired
      const brandColor = '#1C2B45'
      const textDark = '#1f2937'
      const textGray = '#6b7280'
      const textLight = '#9ca3af'
      
      // Helper function to add new page if needed
      const checkPageBreak = (neededSpace: number) => {
        if (yPosition + neededSpace > pageHeight - margin) {
          pdf.addPage()
          yPosition = margin
          return true
        }
        return false
      }
      
      // Header section with InfoWorks branding
      pdf.setFillColor(brandColor)
      pdf.rect(0, 0, pageWidth, 40, 'F')
      
      pdf.setTextColor('#ffffff')
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.text('InfoWorks', margin, 25)
      
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Project Pulse • Roadmap Report', margin, 32)
      
      yPosition = 55
      
      // Project information section
      pdf.setTextColor(textDark)
      pdf.setFontSize(28)
      pdf.setFont('helvetica', 'bold')
      pdf.text(project.name, margin, yPosition)
      yPosition += 12
      
      pdf.setTextColor(textGray)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Client: ${project.client_name}`, margin, yPosition)
      yPosition += 8
      
      if (project.start_date) {
        const startDate = new Date(project.start_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        pdf.text(`Start Date: ${startDate}`, margin, yPosition)
        yPosition += 8
      }
      
      if (project.end_date) {
        const endDate = new Date(project.end_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        pdf.text(`End Date: ${endDate}`, margin, yPosition)
        yPosition += 8
      }
      
      if (project.pm_assigned) {
        pdf.text(`Project Manager: ${project.pm_assigned}`, margin, yPosition)
        yPosition += 8
      }
      
      // Status section
      yPosition += 10
      pdf.setFillColor('#f9fafb')
      pdf.rect(margin, yPosition - 5, contentWidth, 25, 'F')
      
      pdf.setTextColor(textDark)
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Project Status', margin + 5, yPosition + 5)
      
      // Status pill
      const statusColors = {
        'on-track': '#10b981',
        'at-risk': '#f59e0b', 
        'off-track': '#ef4444'
      }
      const statusColor = statusColors[project.overall_status as keyof typeof statusColors] || '#6b7280'
      pdf.setFillColor(statusColor)
      pdf.rect(margin + 5, yPosition + 8, 25, 6, 'F')
      pdf.setTextColor('#ffffff')
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      const statusText = project.overall_status === 'on-track' ? 'ON TRACK' : 
                        project.overall_status === 'at-risk' ? 'AT RISK' : 'OFF TRACK'
      pdf.text(statusText, margin + 7, yPosition + 12)
      
      yPosition += 35
      
      // Progress overview
      if (roadmapTasks.length > 0) {
        checkPageBreak(40)
        
        pdf.setTextColor(textDark)
        pdf.setFontSize(18)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Progress Overview', margin, yPosition)
        yPosition += 15
        
        const completedTasks = roadmapTasks.filter(task => task.status === 'completed').length
        const inProgressTasks = roadmapTasks.filter(task => task.status === 'in-progress').length
        const upcomingTasks = roadmapTasks.filter(task => task.status === 'not-started').length
        const blockedTasks = roadmapTasks.filter(task => task.status === 'blocked').length
        
        // Progress cards layout
        const cardWidth = (contentWidth - 15) / 4
        const progressData = [
          { label: 'Completed', value: completedTasks, color: '#10b981' },
          { label: 'In Progress', value: inProgressTasks, color: '#3b82f6' },
          { label: 'Upcoming', value: upcomingTasks, color: '#6b7280' },
          { label: 'Blocked', value: blockedTasks, color: '#ef4444' }
        ]
        
        progressData.forEach((item, index) => {
          const xPos = margin + (cardWidth + 5) * index
          
          // Card background
          pdf.setFillColor('#f9fafb')
          pdf.rect(xPos, yPosition, cardWidth, 25, 'F')
          
          // Value
          pdf.setTextColor(item.color)
          pdf.setFontSize(24)
          pdf.setFont('helvetica', 'bold')
          pdf.text(item.value.toString(), xPos + cardWidth/2, yPosition + 10, { align: 'center' })
          
          // Label
          pdf.setTextColor(textGray)
          pdf.setFontSize(8)
          pdf.setFont('helvetica', 'normal')
          pdf.text(item.label.toUpperCase(), xPos + cardWidth/2, yPosition + 18, { align: 'center' })
        })
        
        yPosition += 40
      }
      
      // Weekly timeline
      if (sortedWeeks.length > 0) {
        checkPageBreak(30)
        
        pdf.setTextColor(textDark)
        pdf.setFontSize(18)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Project Timeline', margin, yPosition)
        yPosition += 20
        
        const currentWeek = getCurrentWeek()
        
        sortedWeeks.forEach((weekNumber) => {
          checkPageBreak(60)
          
          const isCurrentWeek = weekNumber === currentWeek
          const isCompleted = weekNumber < currentWeek
          const tasksInWeek = tasksByWeek[weekNumber] || []
          
          // Week header
          if (isCurrentWeek) {
            pdf.setFillColor('#dbeafe')
            pdf.rect(margin, yPosition - 3, contentWidth, 12, 'F')
          } else if (isCompleted) {
            pdf.setFillColor('#dcfce7')
            pdf.rect(margin, yPosition - 3, contentWidth, 12, 'F')
          }
          
          pdf.setTextColor(textDark)
          pdf.setFontSize(14)
          pdf.setFont('helvetica', 'bold')
          pdf.text(`Week ${weekNumber}`, margin + 5, yPosition + 3)
          
          // Week badges
          let badgeX = margin + 50
          if (isCurrentWeek) {
            pdf.setFillColor('#3b82f6')
            pdf.rect(badgeX, yPosition - 2, 30, 8, 'F')
            pdf.setTextColor('#ffffff')
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'bold')
            pdf.text('CURRENT', badgeX + 2, yPosition + 2)
            badgeX += 35
          }
          
          if (isCompleted) {
            pdf.setFillColor('#10b981')
            pdf.rect(badgeX, yPosition - 2, 30, 8, 'F')
            pdf.setTextColor('#ffffff')
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'bold')
            pdf.text('COMPLETE', badgeX + 2, yPosition + 2)
          }
          
          yPosition += 15
          
          // Tasks in week
          tasksInWeek.forEach((task) => {
            checkPageBreak(25)
            
            // Task background
            if (task.is_milestone) {
              pdf.setFillColor('#eff6ff')
              pdf.rect(margin + 10, yPosition - 3, contentWidth - 20, 20, 'F')
            }
            
            // Milestone indicator
            if (task.is_milestone) {
              pdf.setFillColor('#3b82f6')
              pdf.circle(margin + 15, yPosition + 3, 2, 'F')
            }
            
            const taskStartX = margin + (task.is_milestone ? 25 : 15)
            
            // Task name
            pdf.setTextColor(textDark)
            pdf.setFontSize(11)
            pdf.setFont('helvetica', 'bold')
            const taskName = task.custom_task_name || task.task_template?.name || 'Unnamed Task'
            pdf.text(taskName, taskStartX, yPosition + 2)
            
            // Task category
            if (task.task_template?.category) {
              pdf.setTextColor(textGray)
              pdf.setFontSize(9)
              pdf.setFont('helvetica', 'normal')
              pdf.text(task.task_template.category, taskStartX, yPosition + 7)
            }
            
            // Assigned to
            if (task.assigned_to) {
              pdf.setTextColor(textGray)
              pdf.setFontSize(9)
              pdf.text(`Assigned: ${task.assigned_to}`, taskStartX, yPosition + 11)
              yPosition += 5
            }
            
            // Task notes/comments
            if (task.notes && task.notes.trim()) {
              pdf.setTextColor(textGray)
              pdf.setFontSize(9)
              pdf.setFont('helvetica', 'italic')
              
              // Split long notes across multiple lines
              const noteLines = pdf.splitTextToSize(task.notes, contentWidth - 80)
              noteLines.forEach((line: string, index: number) => {
                pdf.text(line, taskStartX, yPosition + 11 + (index * 4))
              })
              yPosition += noteLines.length * 4
              pdf.setFont('helvetica', 'normal') // Reset font
            }
            
            // Status and hours
            const rightX = margin + contentWidth - 40
            
            // Hours
            if (task.estimated_hours) {
              pdf.setTextColor(textLight)
              pdf.setFontSize(9)
              pdf.text(`${task.estimated_hours}h`, rightX, yPosition + 2)
            }
            
            // Status pill
            const statusColors = {
              'completed': '#10b981',
              'in-progress': '#3b82f6',
              'blocked': '#ef4444',
              'not-started': '#6b7280'
            }
            const taskStatusColor = statusColors[task.status as keyof typeof statusColors] || '#6b7280'
            pdf.setFillColor(taskStatusColor)
            pdf.rect(rightX, yPosition + 4, 25, 6, 'F')
            pdf.setTextColor('#ffffff')
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'bold')
            const taskStatusText = task.status === 'not-started' ? 'PLANNED' :
                                  task.status === 'in-progress' ? 'ACTIVE' :
                                  task.status === 'completed' ? 'DONE' :
                                  task.status === 'blocked' ? 'BLOCKED' : task.status.toUpperCase()
            pdf.text(taskStatusText, rightX + 1, yPosition + 8)
            
            yPosition += 30 // Increased spacing to accommodate notes
          })
          
          yPosition += 10
        })
      }
      
      // Footer with generation info
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setTextColor(textLight)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Generated by Project Pulse on ${new Date().toLocaleDateString()}`, margin, pageHeight - 10)
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
      }
      
      // Download the PDF
      const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '-')}-roadmap.pdf`
      pdf.save(fileName)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Fallback to JSON download if PDF generation fails
      const roadmapData = {
        project: project?.name,
        client: project?.client_name,
        weeks: sortedWeeks.map(week => ({
          week,
          tasks: tasksByWeek[week] || []
        }))
      }
      
      const dataStr = JSON.stringify(roadmapData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      const exportFileDefaultName = `${project?.name || 'project'}-roadmap.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 text-lg">Loading project roadmap...</p>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#fafafa' }}>
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
            <div className="w-16 h-16 mx-auto mb-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
              <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extralight text-gray-900 mb-6">Access Required</h2>
            <p className="text-lg sm:text-xl text-gray-500 mb-8 sm:mb-16 max-w-lg mx-auto font-light leading-relaxed">
              {authError}
            </p>
            <div className="text-center p-8 bg-white rounded-3xl border border-gray-100">
              <p className="text-gray-500 text-sm font-light">
                Need access? Contact your project manager to get a secure link to your project updates.
              </p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Project not found</h2>
          <motion.button
            onClick={() => router.push(`/client?token=${searchParams?.get('token') || ''}`)}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer mx-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Client Portal
          </motion.button>
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
    <div className="min-h-screen" style={{ backgroundColor: '#fafafa' }}>
      {/* Tesla-Inspired Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-8 space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-8 w-full sm:w-auto">
              <motion.button
                onClick={() => router.push(`/client?token=${searchParams?.get('token') || ''}`)}
                className="flex items-center px-3 py-2 sm:px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer text-sm sm:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Dashboard
              </motion.button>
              <div className="hidden sm:block h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Project Roadmap • {project.client_name}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <motion.button
                onClick={downloadRoadmap}
                className="flex items-center px-3 py-2 sm:px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer text-sm sm:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </motion.button>
              <div className="hidden sm:block">
                <InfoWorksLogo width={120} height={36} />
              </div>
              <div className="block sm:hidden">
                <InfoWorksLogo width={80} height={24} />
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="space-y-6">
              {roadmapTasks.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m2-6h10a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-light text-gray-900 mb-3">No Timeline Available</h3>
                  <p className="text-sm sm:text-base text-gray-500 font-light">Your project manager will create the roadmap soon.</p>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  {/* Progress Overview */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-8">
                    <h2 className="text-xl sm:text-2xl font-light text-gray-900 mb-4 sm:mb-8">Progress Overview</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-light text-green-600 mb-1 sm:mb-2">
                          {roadmapTasks.filter(task => task.status === 'completed').length}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-light text-blue-600 mb-1 sm:mb-2">
                          {roadmapTasks.filter(task => task.status === 'in-progress').length}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">In Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-light text-gray-600 mb-1 sm:mb-2">
                          {roadmapTasks.filter(task => task.status === 'not-started').length}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Upcoming</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-light text-red-600 mb-1 sm:mb-2">
                          {roadmapTasks.filter(task => task.status === 'blocked').length}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Blocked</div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Weekly Timeline - Collapsible */}
                  <div className="space-y-4">
                    {sortedWeeks.map((weekNumber, index) => {
                      const currentWeek = getCurrentWeek()
                      const isCurrentWeek = weekNumber === currentWeek
                      const isCompleted = weekNumber < currentWeek
                      const isCollapsed = collapsedWeeks.has(weekNumber)
                      const tasksInWeek = tasksByWeek[weekNumber] || []
                      const completedTasks = tasksInWeek.filter(t => t.status === 'completed').length
                      
                      // Week collapse state is managed by initial setup
                      
                      return (
                        <motion.div 
                          key={weekNumber}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
                        >
                          <div className="p-4 sm:p-8">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                              <div className="flex items-center space-x-3 sm:space-x-4">
                                <motion.button
                                  onClick={() => toggleWeekCollapse(weekNumber)}
                                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <svg 
                                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform ${
                                      isCollapsed ? 'rotate-0' : 'rotate-90'
                                    }`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </motion.button>
                                <div>
                                  <h3 className="text-lg sm:text-xl font-medium text-gray-900">Week {weekNumber}</h3>
                                  {isCollapsed && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      {tasksInWeek.length} tasks {isCompleted && `• ${completedTasks} completed`}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                                {isCurrentWeek && (
                                  <span className="px-2 sm:px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full whitespace-nowrap">
                                    Current Week
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-full">
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {!isCollapsed && (
                              <div className="space-y-3 sm:space-y-4">
                                {tasksByWeek[weekNumber].map((task) => (
                                  <div key={task.id} className={`group transition-all hover:shadow-sm ${
                                    task.is_milestone 
                                      ? 'p-4 sm:p-6 bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-100' 
                                      : 'p-4 sm:p-6 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-100'
                                  }`}>
                                    <div className="flex flex-col sm:flex-row items-start justify-between space-y-3 sm:space-y-0">
                                      <div className="flex items-start space-x-3 sm:space-x-4 flex-1 w-full sm:w-auto">
                                        {task.is_milestone && (
                                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 sm:mt-1 flex-shrink-0">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                                            {task.custom_task_name || task.task_template?.name}
                                          </div>
                                          {task.task_template && (
                                            <div className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 font-medium">
                                              {task.task_template.category}
                                            </div>
                                          )}
                                          {task.assigned_to && (
                                            <div className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">
                                              <span className="font-medium">Assigned:</span> {task.assigned_to}
                                            </div>
                                          )}
                                          {task.notes && (
                                            <div className="text-xs sm:text-sm text-gray-600 italic leading-relaxed">
                                              {task.notes}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center space-x-2 sm:space-x-4 sm:ml-6 flex-shrink-0 self-start sm:self-center">
                                        {task.estimated_hours && (
                                          <span className="text-xs sm:text-sm font-medium text-gray-500">
                                            {task.estimated_hours}h
                                          </span>
                                        )}
                                        <span className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
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
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
        </div>
      </div>
    </div>
  )
}