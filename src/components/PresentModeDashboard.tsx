'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import ClientTokenManager from '@/components/ClientTokenManager'
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
}

export default function PresentModeDashboard({ 
  projects, 
  currentUser, 
  pendingInvitations, 
  onShowInviteModal,
  onToggleToFutureMode
}: PresentModeDashboardProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.client_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.overall_status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6">
              <motion.div
                className="cursor-pointer"
                onClick={onToggleToFutureMode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Click to toggle to Future Mode"
              >
                <InfoWorksLogo width={120} height={36} />
              </motion.div>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Project Pulse</h1>
                {currentUser && (
                  <p className="text-gray-600 text-sm">{currentUser.full_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser?.role === 'admin' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onShowInviteModal}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Invite PM
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/dashboard/new-project')}
                style={{ backgroundColor: '#1C2B45' }}
                className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                New Project
              </motion.button>
              <SignOutButton className="text-gray-600 hover:text-gray-900" />
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
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Status</option>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {projects.length === 0 ? 'No projects yet' : 'No projects match your search'}
            </h3>
            <p className="text-gray-600 mb-6">
              {projects.length === 0 ? 'Create your first project to get started' : 'Try adjusting your search or filters'}
            </p>
            {projects.length === 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/dashboard/new-project')}
                style={{ backgroundColor: '#1C2B45' }}
                className="px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Create First Project
              </motion.button>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Status Bar */}
                  <div className={`h-2 ${
                    project.overall_status === 'on-track'
                      ? 'bg-green-500'
                      : project.overall_status === 'at-risk'
                      ? 'bg-yellow-500'
                      : project.overall_status === 'off-track'
                      ? 'bg-red-500'
                      : 'bg-gray-400'
                  }`} />
                  
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-gray-600">{project.client_name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {project.overall_status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div>
                        <span className="text-gray-500">PM</span>
                        <p className="text-gray-900 font-medium">{project.pm_assigned}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Timeline</span>
                        <p className="text-gray-900 font-medium">
                          {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push(`/dashboard/${project.id}/update-pulse`)}
                        style={{ backgroundColor: '#1C2B45' }}
                        className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Update Pulse
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push(`/dashboard/${project.id}/roadmap`)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Roadmap
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push(`/dashboard/${project.id}/edit`)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
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
      </div>
    </div>
  )
}