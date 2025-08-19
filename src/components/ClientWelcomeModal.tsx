'use client'

import { useState, useEffect } from 'react'

interface ClientWelcomeModalProps {
  projectName: string
  clientName: string
  pmName: string
}

export default function ClientWelcomeModal({ projectName, clientName, pmName }: ClientWelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if user has seen the welcome modal before
    const hasSeenWelcome = localStorage.getItem(`client-welcome-${projectName}`)
    if (!hasSeenWelcome) {
      setIsOpen(true)
    }
  }, [projectName])

  const handleClose = () => {
    localStorage.setItem(`client-welcome-${projectName}`, 'true')
    setIsOpen(false)
  }

  const handleDismissForever = () => {
    localStorage.setItem(`client-welcome-${projectName}`, 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-0 overflow-hidden">
        <div className="p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center">
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
            </div>
            <h2 className="text-2xl font-extralight text-gray-900 mb-2">{projectName}</h2>
            <p className="text-gray-400 font-light">Welcome, {clientName}</p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Your Project Dashboard</h3>
              <p className="text-gray-500 text-sm font-light leading-relaxed">
                Track progress, view timelines, and stay informed with real-time updates 
                from your dedicated project manager, {pmName}.
              </p>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="w-8 h-8 mx-auto mb-3 bg-gray-50 rounded-xl flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  </div>
                  <p className="text-xs font-medium text-gray-600">Weekly Updates</p>
                </div>
                <div>
                  <div className="w-8 h-8 mx-auto mb-3 bg-gray-50 rounded-xl flex items-center justify-center">
                    <div className="w-3 h-3 border border-gray-300 rounded"></div>
                  </div>
                  <p className="text-xs font-medium text-gray-600">Live Timeline</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleClose}
              style={{ backgroundColor: '#1C2B45' }}
              className="w-full py-4 text-white font-medium rounded-2xl hover:opacity-90 transition-opacity"
            >
              Explore Dashboard
            </button>
            <button
              onClick={handleDismissForever}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
            >
              Don't show again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}