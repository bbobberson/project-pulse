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
  
  // 🚀 REVOLUTIONARY HYBRID STATE
  const [viewMode, setViewMode] = useState<'overview' | 'immersive'>('overview')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

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

  // 🌌 CLIENT-SIDE INITIALIZATION
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 🎯 MOUSE TRACKING FOR PROXIMITY EFFECTS
  useEffect(() => {
    if (viewMode === 'overview') {
      const handleMouseMove = (e: MouseEvent) => {
        setMousePosition({ x: e.clientX, y: e.clientY })
      }
      window.addEventListener('mousemove', handleMouseMove)
      return () => window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [viewMode])

  // 🚀 REVOLUTIONARY MODE FUNCTIONS
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

  // 🔍 FILTER PROJECTS WITH DEDUPLICATION
  const filteredProjects = projects
    .filter((project, index, self) => 
      self.findIndex(p => p.id === project.id) === index
    )
    .filter(project => {
      const matchesSearch = searchQuery === '' || 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client_name.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || project.overall_status === statusFilter
      
      return matchesSearch && matchesStatus
    })

  // 🌌 REVOLUTIONARY SPATIAL LAYOUT CALCULATION - STABLE POSITIONS
  const calculateSpatialPosition = (index: number, total: number) => {
    if (!isClient) return { x: 0, y: 0, scale: 1, rotation: 0 }
    
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    
    // Create organic constellation pattern - STABLE, no mouse jumping
    const angle = (index / total) * Math.PI * 2
    const radius = Math.min(centerX, centerY) * 0.35
    const spiralOffset = Math.sin(index * 0.8) * 60
    
    return {
      x: centerX + Math.cos(angle) * (radius + spiralOffset),
      y: centerY + Math.sin(angle) * (radius + spiralOffset),
      scale: 1,
      rotation: Math.sin(angle) * 8
    }
  }

  // 🎯 PROXIMITY DETECTION FOR HOVER EFFECTS
  const calculateProximity = (cardX: number, cardY: number) => {
    if (!isClient) return { distance: 999, isClose: false, magneticPull: 0 }
    
    const dx = mousePosition.x - cardX
    const dy = mousePosition.y - cardY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const isClose = distance < 180
    const magneticPull = Math.max(0, (180 - distance) / 180) // 0 to 1 based on proximity
    
    return { distance, isClose, magneticPull }
  }

  // 📏 DYNAMIC CARD SIZING BASED ON PROJECT COUNT & STATUS
  const calculateCardSize = (status: string, projectCount: number) => {
    // Base size calculation - fewer projects = larger cards
    let baseWidth = 320 // Start with w-80 equivalent
    let baseHeight = 180 // Start with h-45 equivalent
    
    if (projectCount <= 3) {
      baseWidth = 400  // w-100 - Very large for 1-3 projects
      baseHeight = 220 // h-55
    } else if (projectCount <= 8) {
      baseWidth = 350  // w-88 - Large for 4-8 projects  
      baseHeight = 200 // h-50
    } else if (projectCount <= 15) {
      baseWidth = 300  // w-75 - Medium for 9-15 projects
      baseHeight = 170 // h-42
    } else {
      baseWidth = 250  // w-64 - Small for 16+ projects
      baseHeight = 140 // h-35
    }

    // Status influence - critical projects get attention
    if (status === 'off-track') {
      baseWidth *= 1.15  // 15% larger for off-track
      baseHeight *= 1.15
    } else if (status === 'at-risk') {
      baseWidth *= 1.08  // 8% larger for at-risk
      baseHeight *= 1.08
    }

    return { width: Math.round(baseWidth), height: Math.round(baseHeight) }
  }

  // 🎨 STATUS VISUALIZATION SYSTEM
  const getStatusVisualization = (status: string) => {
    switch (status) {
      case 'on-track':
        return {
          color: 'from-emerald-400 to-green-600',
          glow: 'shadow-emerald-400/40',
          particles: '✨',
          bgOpacity: 'bg-emerald-500/10'
        }
      case 'at-risk':
        return {
          color: 'from-amber-400 to-orange-500', 
          glow: 'shadow-amber-400/40',
          particles: '⚡',
          bgOpacity: 'bg-amber-500/10'
        }
      case 'off-track':
        return {
          color: 'from-red-400 to-rose-600',
          glow: 'shadow-rose-400/40', 
          particles: '🔥',
          bgOpacity: 'bg-rose-500/10'
        }
      default:
        return {
          color: 'from-gray-400 to-gray-600',
          glow: 'shadow-gray-400/40',
          particles: '💫',
          bgOpacity: 'bg-gray-500/10'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading cosmic interface...</div>
      </div>
    )
  }

  // 🌟 IMMERSIVE MODE - Full screen project experience
  if (viewMode === 'immersive' && selectedProject) {
    const statusViz = getStatusVisualization(selectedProject.overall_status)
    
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${statusViz.color} opacity-10`} />
        
        {/* Back button */}
        <button
          onClick={exitImmersiveMode}
          className="fixed top-6 left-6 z-50 px-6 py-3 bg-white/10 backdrop-blur-xl text-white rounded-2xl border border-white/20 hover:bg-white/20 transition-all"
        >
          ← Back to Cosmos
        </button>

        {/* Project content - SIMPLE AND ALWAYS VISIBLE */}
        <div className="min-h-screen flex items-center justify-center px-12 relative z-10">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-8xl font-extralight text-white mb-8 leading-none tracking-tight">
              {selectedProject.name}
            </h1>
            
            <p className="text-3xl font-light text-white/70 mb-12">
              {selectedProject.client_name}
            </p>
            
            <div className="text-2xl font-medium text-white mb-16 flex items-center justify-center gap-4">
              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${statusViz.color}`}></div>
              Status: {selectedProject.overall_status.replace('-', ' ')}
            </div>

            {/* Action buttons */}
            <div className="flex gap-6 justify-center">
              <button 
                onClick={() => router.push(`/dashboard/${selectedProject.id}/update-pulse`)}
                className="px-8 py-4 bg-white/10 backdrop-blur-xl text-white rounded-2xl border border-white/20 hover:bg-white/20 transition-all"
              >
                Update Pulse
              </button>
              <button 
                onClick={() => router.push(`/dashboard/${selectedProject.id}/roadmap`)}
                className="px-8 py-4 bg-white/10 backdrop-blur-xl text-white rounded-2xl border border-white/20 hover:bg-white/20 transition-all"
              >
                Roadmap
              </button>
              <button 
                onClick={() => router.push(`/dashboard/${selectedProject.id}/edit`)}
                className="px-8 py-4 bg-white/10 backdrop-blur-xl text-white rounded-2xl border border-white/20 hover:bg-white/20 transition-all"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 🌌 REVOLUTIONARY SPATIAL OVERVIEW MODE
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Onboarding Modal */}
      {currentUser && (
        <OnboardingModal userEmail={currentUser.email} />
      )}
      
      {/* Cosmic Header */}
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
                  className="px-6 py-3 bg-white/20 text-white font-light rounded-2xl hover:bg-white/30 transition-all duration-300 border border-white/20"
                >
                  New Project
                </motion.button>
                <SignOutButton className="px-6 py-3 text-white/60 hover:text-white/90 font-light transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 🌟 Cosmic Center Title */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
        className="text-center pt-32 pb-16 relative z-10"
      >
        <h1 className="text-8xl md:text-9xl font-extralight text-white mb-8 leading-none tracking-tight">
          Your Universe
        </h1>
        <p className="text-2xl md:text-3xl font-extralight text-white/60 max-w-3xl mx-auto">
          {filteredProjects.length === 0 
            ? (projects.length === 0 ? "Ready to create your first constellation" : "No projects match your search criteria")
            : `${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''} orbiting in your space`
          }
        </p>
      </motion.div>

      {/* 🔍 Search Interface */}
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

      {/* 🚀 REVOLUTIONARY SPATIAL PROJECT CONSTELLATION */}
      <div className="relative min-h-screen flex items-center justify-center px-6">
        {filteredProjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-center z-10"
          >
            <motion.div 
              className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.p 
              className="text-2xl font-extralight text-white/40 mb-12"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {projects.length === 0 ? "Launch your first project into the void" : "Adjust your cosmic filters"}
            </motion.p>
            {projects.length === 0 ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.1, y: -10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => router.push('/dashboard/new-project')}
                  className="px-16 py-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-light text-xl rounded-full shadow-2xl shadow-blue-500/30 transition-all duration-500"
                >
                  Launch Project
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className="px-12 py-4 bg-white/10 backdrop-blur-xl text-white font-light text-lg rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  Clear Filters
                </motion.button>
              </>
            )}
          </motion.div>
        ) : (
          <div className="relative w-full h-screen">
            <AnimatePresence>
              {filteredProjects.map((project, index) => {
                const position = calculateSpatialPosition(index, filteredProjects.length)
                const statusViz = getStatusVisualization(project.overall_status)
                const proximity = calculateProximity(position.x, position.y)
                const cardSize = calculateCardSize(project.overall_status, filteredProjects.length)
                
                return (
                  <motion.div
                    key={project.id}
                    className="absolute cursor-pointer"
                    initial={{ opacity: 0, scale: 0.3, rotate: 180 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      rotate: 0,
                      x: position.x - cardSize.width/2 + (proximity.magneticPull * 8), // Subtle magnetic pull
                      y: position.y - cardSize.height/2 + (proximity.magneticPull * -5), // Slight lift toward cursor
                    }}
                    exit={{ opacity: 0, scale: 0.3, rotate: -180 }}
                    transition={{ 
                      duration: 1.5, 
                      delay: index * 0.15,
                      type: "spring",
                      stiffness: 50,
                      damping: 20
                    }}
                    onClick={() => enterImmersiveMode(project)}
                    onHoverStart={() => setHoveredProject(project.id)}
                    onHoverEnd={() => setHoveredProject(null)}
                  >
                    {/* 🌌 FLOATING COSMIC CARD */}
                    <motion.div
                      className="relative rounded-3xl backdrop-blur-2xl border border-white/10 p-6 shadow-2xl overflow-hidden"
                      style={{
                        width: cardSize.width,
                        height: cardSize.height,
                        background: `linear-gradient(135deg, ${statusViz.color.includes('emerald') ? 'rgba(16, 185, 129, 0.1)' : statusViz.color.includes('amber') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'} 0%, rgba(0, 0, 0, 0.2) 100%)`,
                        transform: `rotate(${position.rotation + (proximity.magneticPull * 3)}deg)` // Gentle rotation toward mouse
                      }}
                      animate={{
                        // 🌊 FLOATING ANIMATION - Always active
                        y: [0, -8, 0],
                        rotateX: [0, 2, 0],
                        rotateY: [0, -1, 0],
                        // Enhanced effects when close
                        boxShadow: proximity.isClose 
                          ? `0 40px 80px ${statusViz.color.includes('emerald') ? 'rgba(16, 185, 129, 0.3)' : statusViz.color.includes('amber') ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          : `0 20px 40px ${statusViz.color.includes('emerald') ? 'rgba(16, 185, 129, 0.15)' : statusViz.color.includes('amber') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`
                      }}
                      transition={{ 
                        y: { duration: 3 + index * 0.5, repeat: Infinity, ease: "easeInOut" },
                        rotateX: { duration: 4 + index * 0.3, repeat: Infinity, ease: "easeInOut" },
                        rotateY: { duration: 5 + index * 0.2, repeat: Infinity, ease: "easeInOut" },
                        boxShadow: { duration: 0.3 }
                      }}
                    >
                      {/* 🎆 FLOATING PARTICLES - Status driven */}
                      <div className="absolute inset-0 pointer-events-none">
                        {[...Array(proximity.isClose ? 6 : 3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white/30 rounded-full"
                            animate={{
                              x: [0, 60, 0],
                              y: [0, -30, 0],
                              opacity: [0.1, 0.6, 0.1],
                              scale: [0.5, 1.2, 0.5]
                            }}
                            transition={{
                              duration: 4 + i * 0.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: i * 0.7
                            }}
                            style={{
                              left: `${15 + i * 15}%`,
                              top: `${20 + i * 12}%`
                            }}
                          />
                        ))}
                      </div>

                      {/* CARD CONTENT */}
                      <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                          {/* Status Dot with Magnetic Pulse */}
                          <motion.div 
                            className="w-3 h-3 rounded-full"
                            style={{
                              background: `linear-gradient(135deg, ${statusViz.color.includes('emerald') ? '#10b981' : statusViz.color.includes('amber') ? '#f59e0b' : '#ef4444'}, ${statusViz.color.includes('emerald') ? '#059669' : statusViz.color.includes('amber') ? '#d97706' : '#dc2626'})`
                            }}
                            animate={{
                              scale: 1 + (proximity.magneticPull * 0.5),
                              boxShadow: proximity.magneticPull > 0.3 ? `0 0 20px ${statusViz.color.includes('emerald') ? '#10b981' : statusViz.color.includes('amber') ? '#f59e0b' : '#ef4444'}80` : 'none'
                            }}
                            transition={{ duration: 0.2 }}
                          />
                          
                          {/* Status Particle with Enhanced Animation */}
                          <motion.div 
                            className="text-3xl"
                            animate={{
                              scale: 1 + (proximity.magneticPull * 0.3),
                              rotate: proximity.magneticPull * 15
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            {statusViz.particles}
                          </motion.div>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center">
                          <h3 className={`font-light text-white mb-2 leading-tight ${cardSize.width > 350 ? 'text-2xl' : cardSize.width > 300 ? 'text-xl' : 'text-lg'}`}>
                            {project.name}
                          </h3>
                          
                          {/* Show client only on larger cards */}
                          {cardSize.width > 320 && (
                            <p className="text-white/70 text-sm mb-2">
                              {project.client_name}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-xl text-white border border-white/20"
                            style={{
                              background: `${statusViz.color.includes('emerald') ? 'rgba(16, 185, 129, 0.2)' : statusViz.color.includes('amber') ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                            }}>
                            {project.overall_status.replace('-', ' ')}
                          </div>
                          
                          {/* Hover hint only on larger cards */}
                          {cardSize.width > 300 && proximity.magneticPull > 0.4 && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-white/50 text-xs"
                            >
                              Click to explore →
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* 🧲 MAGNETIC AURA EFFECT */}
                      {proximity.magneticPull > 0.2 && (
                        <motion.div
                          className="absolute inset-0 rounded-3xl border-2 border-white/20 pointer-events-none"
                          animate={{
                            opacity: proximity.magneticPull * 0.5,
                            scale: 1 + (proximity.magneticPull * 0.05)
                          }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </motion.div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
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