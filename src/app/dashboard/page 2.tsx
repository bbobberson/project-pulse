'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase-browser'
import { supabase as supabaseAuth } from '@/lib/supabase-browser'
import InfoWorksLogo from '@/components/InfoWorksLogo'
import ClientTokenManager from '@/components/ClientTokenManager'
import OnboardingModal from '@/components/OnboardingModal'
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

type ViewMode = 'overview' | 'immersive'

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
  const [isClient, setIsClient] = useState(false)
  const [clientParticles, setClientParticles] = useState<Array<{id: number, emoji: string, x: number, y: number, delay: number, duration: number}>>([])
  
  // Revolutionary hybrid state
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)

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

  // Initialize client-side particles to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
    const particles = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      emoji: ['✨', '⚡', '🔥', '💫'][Math.floor(Math.random() * 4)],
      x: Math.random() * (window.innerWidth || 800),
      y: Math.random() * (window.innerHeight || 600),
      delay: Math.random() * 3,
      duration: 8 + Math.random() * 12
    }))
    setClientParticles(particles)
  }, [])

  // Mouse tracking for spatial interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (viewMode === 'overview') {
        setMousePosition({ x: e.clientX, y: e.clientY })
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [viewMode])

  // Keyboard navigation for immersive mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const filteredProjects = projects
        .filter((project, index, self) => 
          // Deduplicate by ID first
          self.findIndex(p => p.id === project.id) === index
        )
        .filter(project => {
          const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               project.client_name.toLowerCase().includes(searchQuery.toLowerCase())
          const matchesStatus = statusFilter === 'all' || project.overall_status === statusFilter
          return matchesSearch && matchesStatus
        })

      if (viewMode === 'immersive' && selectedProject && filteredProjects.length > 1) {
        const currentIndex = filteredProjects.findIndex(p => p.id === selectedProject.id)
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          const nextIndex = (currentIndex + 1) % filteredProjects.length
          setSelectedProject(filteredProjects[nextIndex])
        }
        
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          const prevIndex = currentIndex === 0 ? filteredProjects.length - 1 : currentIndex - 1
          setSelectedProject(filteredProjects[prevIndex])
        }
      }
      
      if (e.key === 'Escape' && viewMode === 'immersive') {
        exitImmersiveMode()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [viewMode, selectedProject, projects, searchQuery, statusFilter])

  const enterImmersiveMode = (project: Project) => {
    setSelectedProject(project)
    setViewMode('immersive')
  }

  const exitImmersiveMode = () => {
    setViewMode('overview')
    setSelectedProject(null)
  }

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

  // Filter projects based on search query and status (with deduplication)
  const filteredProjects = projects
    .filter((project, index, self) => 
      // Deduplicate by ID first
      self.findIndex(p => p.id === project.id) === index
    )
    .filter(project => {
      const matchesSearch = searchQuery === '' || 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client_name.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || project.overall_status === statusFilter
      
      return matchesSearch && matchesStatus
    })

  // Revolutionary spatial layout calculation
  const calculateSpatialPosition = (index: number, total: number) => {
    if (typeof window === 'undefined') return { x: 0, y: 0, scale: 1, rotation: 0 }
    
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    
    // Create organic, flowing layout instead of rigid grid
    const angle = (index / total) * Math.PI * 2
    const radius = Math.min(centerX, centerY) * 0.25
    const spiralOffset = Math.sin(index * 0.8) * 80
    
    const baseX = Math.cos(angle) * (radius + spiralOffset)
    const baseY = Math.sin(angle) * (radius + spiralOffset * 0.7)
    
    // Add subtle mouse influence
    const mouseInfluenceX = (mousePosition.x - centerX) * 0.015
    const mouseInfluenceY = (mousePosition.y - centerY) * 0.015
    
    return {
      x: centerX + baseX + mouseInfluenceX - 200, // Center 400px cards
      y: centerY + baseY + mouseInfluenceY - 150, // Center 300px cards
      scale: hoveredProject === filteredProjects[index]?.id ? 1.05 : 1,
      rotation: Math.sin(angle + Date.now() * 0.0001) * 3 // Subtle rotation
    }
  }

  const getStatusVisualization = (status: string) => {
    switch (status) {
      case 'on-track':
        return {
          color: 'from-emerald-400 to-green-300',
          glow: 'shadow-emerald-400/40',
          particles: '✨',
          bgOpacity: 'bg-emerald-500/10'
        }
      case 'at-risk':
        return {
          color: 'from-amber-400 to-yellow-300',
          glow: 'shadow-amber-400/40',
          particles: '⚡',
          bgOpacity: 'bg-amber-500/10'
        }
      case 'off-track':
        return {
          color: 'from-rose-400 to-red-300',
          glow: 'shadow-rose-400/40',
          particles: '🔥',
          bgOpacity: 'bg-rose-500/10'
        }
      default:
        return {
          color: 'from-gray-400 to-gray-300',
          glow: 'shadow-gray-400/40',
          particles: '💫',
          bgOpacity: 'bg-gray-500/10'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20" />
        
        {/* Floating particles during load - client-side only */}
        {isClient && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {clientParticles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute text-4xl opacity-20"
                initial={{ 
                  x: particle.x,
                  y: particle.y,
                }}
                animate={{
                  y: [0, -50, 0],
                  x: [0, 25, 0],
                  rotate: [0, 180],
                  opacity: [0.1, 0.4, 0.1]
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  delay: particle.delay
                }}
              >
                {particle.emoji}
              </motion.div>
            ))}
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="text-center z-10"
        >
          <motion.div 
            className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.p 
            className="text-4xl font-extralight text-white/80"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Entering your cosmos...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  // IMMERSIVE MODE - Full screen project experience
  if (viewMode === 'immersive' && selectedProject) {
    const statusViz = getStatusVisualization(selectedProject.overall_status)
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-black relative overflow-hidden"
      >
        {/* Dynamic background based on project status */}
        <motion.div 
          key={`bg-${selectedProject.id}`}
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 1 }}
          className={`absolute inset-0 bg-gradient-to-br ${statusViz.color} opacity-5`}
        />
        
        {/* Ambient floating particles - client-side only */}
        {isClient && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 25 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-6xl opacity-10"
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                }}
                animate={{
                  y: [0, -120, 0],
                  x: [0, 100, 0],
                  rotate: [0, 360],
                  opacity: [0.05, 0.2, 0.05]
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              >
                {statusViz.particles}
              </motion.div>
            ))}
          </div>
        )}

        {/* Exit & Navigation Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed top-8 left-8 z-50"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={exitImmersiveMode}
            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/20 transition-all duration-300 shadow-2xl"
          >
            <span className="text-2xl">←</span>
          </motion.button>
        </motion.div>

        {/* Keyboard navigation hints */}
        {filteredProjects.length > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="fixed top-8 right-8 z-50 text-white/40 text-sm font-light space-y-1"
          >
            <div>← → Navigate projects</div>
            <div>ESC Exit immersive</div>
          </motion.div>
        )}

        {/* Main immersive content */}
        <motion.div 
          key={`content-${selectedProject.id}`}
          initial={{ opacity: 0, scale: 0.8, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.2, y: -100 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-screen flex items-center justify-center px-12"
        >
          <div className="max-w-6xl mx-auto text-center">
            {/* Massive project title */}
            <motion.h1 
              className="text-8xl md:text-9xl font-extralight text-white mb-6 leading-none tracking-tight"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              {selectedProject.name}
            </motion.h1>
            
            {/* Client */}
            <motion.p 
              className="text-3xl md:text-4xl font-extralight text-white/60 mb-16"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {selectedProject.client_name}
            </motion.p>

            {/* Status with visual indicator */}
            <motion.div 
              className="flex items-center justify-center mb-20"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <motion.div 
                className={`w-6 h-6 rounded-full bg-gradient-to-r ${statusViz.color} ${statusViz.glow} shadow-2xl mr-6`}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span className="text-2xl md:text-3xl font-extralight text-white/80 uppercase tracking-[0.3em]">
                {selectedProject.overall_status.replace('-', ' ')}
              </span>
            </motion.div>

            {/* Floating action buttons */}
            <motion.div 
              className="flex flex-wrap justify-center gap-8 mb-20"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <motion.button
                whileHover={{ scale: 1.1, y: -10 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => router.push(`/dashboard/${selectedProject.id}/update-pulse`)}
                className="px-12 py-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white font-light text-xl hover:bg-white/20 transition-all duration-500 shadow-2xl"
              >
                Update Pulse
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1, y: -10 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => router.push(`/dashboard/${selectedProject.id}/roadmap`)}
                className="px-12 py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white/80 font-light text-xl hover:bg-white/10 transition-all duration-500"
              >
                Roadmap
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1, y: -10 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => router.push(`/dashboard/${selectedProject.id}/edit`)}
                className="px-12 py-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white/80 font-light text-xl hover:bg-white/10 transition-all duration-500"
              >
                Settings
              </motion.button>
            </motion.div>

            {/* Project details grid */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              <div className="text-center">
                <div className="text-sm font-extralight text-white/30 uppercase tracking-[0.2em] mb-4">Project Manager</div>
                <div className="text-2xl md:text-3xl font-extralight text-white">{selectedProject.pm_assigned}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-extralight text-white/30 uppercase tracking-[0.2em] mb-4">Timeline</div>
                <div className="text-2xl md:text-3xl font-extralight text-white">
                  {new Date(selectedProject.start_date).toLocaleDateString()} → {selectedProject.end_date ? new Date(selectedProject.end_date).toLocaleDateString() : 'Ongoing'}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // OVERVIEW MODE - Revolutionary spatial dashboard
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Onboarding Modal */}
      {currentUser && (
        <OnboardingModal userEmail={currentUser.email} />
      )}
      
      {/* Dynamic cosmic background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20" />
        <motion.div 
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 60%)',
              'radial-gradient(circle at 80% 50%, #8b5cf6 0%, transparent 60%)',
              'radial-gradient(circle at 50% 20%, #06b6d4 0%, transparent 60%)',
              'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 60%)'
            ]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Floating Navigation */}
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-6 left-6 right-6 z-50"
      >
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl">
          <div className="max-w-7xl mx-auto px-8 py-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-8">
                <InfoWorksLogo width={120} height={36} />
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <h1 className="text-xl font-extralight text-white tracking-wide">Project Pulse</h1>
                  {currentUser && (
                    <p className="text-white/40 text-xs font-light">{currentUser.full_name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {currentUser?.role === 'admin' && (
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowInviteModal(true)}
                    className="px-6 py-3 bg-white/10 text-white/80 font-light rounded-2xl hover:bg-white/20 transition-all duration-300 border border-white/10"
                  >
                    Invite PM
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/dashboard/new-project')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-light rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/25"
                >
                  New Project
                </motion.button>
                <SignOutButton className="px-4 py-3 text-white/60 hover:text-white font-light transition-colors duration-300" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Hero Section */}
      <motion.div 
        className="pt-32 pb-20 text-center relative z-10"
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-8xl md:text-9xl font-extralight text-white mb-8 leading-none tracking-tight">
          Your Universe
        </h1>
        <p className="text-2xl md:text-3xl font-extralight text-white/60 max-w-3xl mx-auto">
          {projects.length === 0 
            ? "Ready to create your first constellation" 
            : `${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''} orbiting in your space`
          }
        </p>
      </motion.div>

      {/* Search Interface */}
      {projects.length > 0 && (
        <motion.div 
          className="fixed bottom-6 left-6 right-6 z-50"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex gap-6">
              <motion.input
                type="text"
                placeholder="Search the cosmos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 font-light text-lg focus:outline-none focus:border-white/30 transition-all duration-300"
                whileFocus={{ scale: 1.005 }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-light text-lg focus:outline-none focus:border-white/30 transition-all appearance-none cursor-pointer min-w-[200px]"
              >
                <option value="all" className="bg-black">All Status</option>
                <option value="on-track" className="bg-black">On Track</option>
                <option value="at-risk" className="bg-black">At Risk</option>
                <option value="off-track" className="bg-black">Off Track</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Revolutionary Spatial Project Layout */}
      <div className="relative min-h-screen flex items-center justify-center px-6">
        {filteredProjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-center"
          >
            <motion.div 
              className="w-48 h-48 mx-auto mb-16 rounded-full bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
              <div className="text-8xl">🌟</div>
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-extralight text-white mb-8">Create Your First Project</h2>
            <p className="text-xl md:text-2xl font-extralight text-white/60 mb-16 max-w-2xl mx-auto">
              Launch your first project into the cosmos and begin tracking its journey through space and time
            </p>
            <motion.button
              whileHover={{ scale: 1.1, y: -10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/dashboard/new-project')}
              className="px-16 py-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-light text-xl rounded-full shadow-2xl shadow-blue-500/30 transition-all duration-500"
            >
              Launch Project
            </motion.button>
          </motion.div>
        ) : (
          <div className="relative w-full h-screen">
            <AnimatePresence>
              {filteredProjects.map((project, index) => {
                const position = calculateSpatialPosition(index, filteredProjects.length)
                const statusViz = getStatusVisualization(project.overall_status)
                
                return (
                  <motion.div
                    key={project.id}
                    className="absolute cursor-pointer"
                    initial={{ opacity: 0, scale: 0, rotate: 180 }}
                    animate={{ 
                      opacity: 1, 
                      scale: position.scale,
                      x: position.x,
                      y: position.y,
                      rotate: position.rotation
                    }}
                    exit={{ opacity: 0, scale: 0, rotate: -180 }}
                    transition={{ 
                      duration: 0.8, 
                      delay: index * 0.15,
                      type: "spring",
                      stiffness: 80,
                      damping: 20
                    }}
                    whileHover={{ 
                      scale: 1.1, 
                      z: 100,
                      transition: { duration: 0.3 }
                    }}
                    onClick={() => enterImmersiveMode(project)}
                    onHoverStart={() => setHoveredProject(project.id)}
                    onHoverEnd={() => setHoveredProject(null)}
                    style={{ 
                      width: '400px', 
                      height: '300px'
                    }}
                  >
                    {/* Project card with glass morphism */}
                    <div className={`w-full h-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 ${statusViz.glow} shadow-2xl relative overflow-hidden`}>
                      {/* Animated status indicator */}
                      <motion.div 
                        className={`absolute top-4 right-4 w-4 h-4 rounded-full bg-gradient-to-r ${statusViz.color} shadow-lg`}
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.7, 1, 0.7]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      
                      {/* Project content */}
                      <div className="relative z-10">
                        <h3 className="text-2xl font-extralight text-white mb-2 truncate">
                          {project.name}
                        </h3>
                        <p className="text-lg font-extralight text-white/60 mb-6 truncate">
                          {project.client_name}
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs font-extralight text-white/30 uppercase tracking-wider mb-1">
                              Project Manager
                            </div>
                            <div className="text-sm font-light text-white/80 truncate">
                              {project.pm_assigned}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs font-extralight text-white/30 uppercase tracking-wider mb-1">
                              Status
                            </div>
                            <div className="text-sm font-light text-white/80 capitalize">
                              {project.overall_status.replace('-', ' ')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hover overlay */}
                      <motion.div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-3xl flex items-center justify-center opacity-0"
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="text-white/90 font-light text-lg">
                          Click to dive deep
                        </div>
                      </motion.div>

                      {/* Background particles - client-side only */}
                      {isClient && (
                        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute text-2xl opacity-5"
                              initial={{ 
                                x: (i * 80) % 400,
                                y: (i * 60) % 300,
                              }}
                              animate={{
                                y: [0, -30, 0],
                                opacity: [0.02, 0.15, 0.02]
                              }}
                              transition={{
                                duration: 6,
                                repeat: Infinity,
                                delay: i * 0.5
                              }}
                            >
                              {statusViz.particles}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-8"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/10 backdrop-blur-2xl rounded-3xl p-12 w-full max-w-lg border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-4xl font-extralight text-white mb-12 text-center">
                Invite Project Manager
              </h2>
              
              <form onSubmit={handleInviteSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-extralight text-white/80 mb-4">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteFormData.email}
                      onChange={(e) => setInviteFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-6 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-white/40 font-light text-xl focus:outline-none focus:border-white/40 transition-all duration-300"
                      placeholder="pm@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-extralight text-white/80 mb-4">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteFormData.fullName}
                      onChange={(e) => setInviteFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-6 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-white/40 font-light text-xl focus:outline-none focus:border-white/40 transition-all duration-300"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-extralight text-white/80 mb-4">
                      Company
                    </label>
                    <input
                      type="text"
                      value={inviteFormData.company}
                      onChange={(e) => setInviteFormData(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full px-6 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-white/40 font-light text-xl focus:outline-none focus:border-white/40 transition-all duration-300"
                      placeholder="InfoWorks"
                    />
                  </div>
                </div>

                <div className="flex gap-6 pt-8">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-8 py-4 bg-white/5 text-white/80 font-light rounded-2xl hover:bg-white/10 transition-all duration-300 border border-white/20"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={inviteLoading}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-light rounded-2xl transition-all duration-300 shadow-lg shadow-blue-500/25 disabled:opacity-50"
                  >
                    {inviteLoading ? 'Sending...' : 'Send Invitation'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}