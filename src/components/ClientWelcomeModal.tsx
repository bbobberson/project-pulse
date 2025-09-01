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
    // Only show welcome modal once per session unless dismissed permanently
    const hasBeenDismissed = localStorage.getItem(`client-welcome-dismissed-${projectName}`)
    const hasShownThisSession = sessionStorage.getItem(`client-welcome-shown-${projectName}`)
    
    if (!hasBeenDismissed && !hasShownThisSession) {
      setIsOpen(true)
      sessionStorage.setItem(`client-welcome-shown-${projectName}`, 'true')
    }
  }, [projectName])

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleDismissForever = () => {
    localStorage.setItem(`client-welcome-dismissed-${projectName}`, 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">{projectName}</h2>
            <p className="text-gray-500 text-sm">Welcome, {clientName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your Project Portal</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Stay informed with real-time updates, view project timelines, 
              and access important documents from your dedicated team.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Weekly Progress Updates</p>
                <p className="text-xs text-gray-500">Latest updates from {pmName}</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m2-6h10a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Interactive Roadmap</p>
                <p className="text-xs text-gray-500">Visual timeline and milestones</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Project Documents</p>
                <p className="text-xs text-gray-500">Access files and deliverables</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex flex-col gap-3">
          <button
            onClick={handleClose}
            style={{ backgroundColor: '#1C2B45' }}
            className="w-full py-3 text-white font-medium rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            Get Started
          </button>
          <label className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-900 cursor-pointer">
            <input
              type="checkbox"
              onChange={(e) => {
                if (e.target.checked) {
                  handleDismissForever()
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus-brand"
            />
            <span className="text-sm">Don't show this again</span>
          </label>
        </div>
      </div>
    </div>
  )
}