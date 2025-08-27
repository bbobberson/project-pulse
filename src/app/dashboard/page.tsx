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
import DashboardModeToggle from '@/components/DashboardModeToggle'
import PresentModeDashboard from '@/components/PresentModeDashboard'
import FutureModeUniverse from '@/components/FutureModeUniverse'

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
  
  // 🚀 DASHBOARD MODE STATE
  const [dashboardMode, setDashboardMode] = useState<'present' | 'future'>('present')

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

  // 🌌 MODE TOGGLE SYSTEM
  return (
    <div className="min-h-screen">
      {/* Onboarding Modal */}
      {dashboardMode === 'present' && currentUser && (
        <OnboardingModal userEmail={currentUser.email} />
      )}

      {/* Mode Toggle - Fixed Position */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="fixed top-4 right-4 z-50"
      >
        <DashboardModeToggle
          mode={dashboardMode}
          onToggle={setDashboardMode}
        />
      </motion.div>

      {/* Mode-Based Dashboard Rendering */}
      <AnimatePresence mode="wait">
        {dashboardMode === 'present' ? (
          <motion.div
            key="present"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <PresentModeDashboard
              projects={projects}
              currentUser={currentUser}
              pendingInvitations={pendingInvitations}
              onShowInviteModal={() => setShowInviteModal(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="future"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <FutureModeUniverse
              projects={projects}
              currentUser={currentUser}
              pendingInvitations={pendingInvitations}
              onShowInviteModal={() => setShowInviteModal(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite PM Modal - Shared between modes */}
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
