'use client'

import { useState, useEffect } from 'react'

interface OnboardingModalProps {
  userEmail: string
}

export default function OnboardingModal({ userEmail }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${userEmail}`)
    if (!hasSeenOnboarding) {
      setIsOpen(true)
    }
  }, [userEmail])

  const closeOnboarding = (dismissForever = false) => {
    if (dismissForever) {
      localStorage.setItem(`onboarding_seen_${userEmail}`, 'true')
    }
    setIsOpen(false)
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      closeOnboarding(true)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const steps = [
    {
      title: "Welcome to Project Pulse!",
      content: (
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">The Greatest PM App Ever Built™</h2>
          <p className="text-gray-600 mb-4">
            You've just joined the revolution in project management. No more Excel spreadsheets, 
            no more "What's the status?" emails, no more client confusion.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>🔧 Beta Notice:</strong> This app is still in development - expect some rough edges 
              but amazing functionality! Think of yourself as a pioneer testing the future.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Build Beautiful Roadmaps",
      content: (
        <div>
          <div className="w-14 h-14 mx-auto mb-6 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">Drag & Drop Project Planning</h3>
          <ul className="space-y-2 text-gray-600 mb-4">
            <li>• Drag tasks into weekly timelines</li>
            <li>• Choose from 45+ pre-built task templates</li>
            <li>• Mark milestones and track progress</li>
            <li>• Visual roadmaps your clients will love</li>
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Pro Tip:</strong> Start with our task library - it has everything from "Discovery Calls" 
              to "Go-Live Celebration" 🎊
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Real-Time Client Updates",
      content: (
        <div>
          <div className="w-14 h-14 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">Keep Clients in the Loop</h3>
          <ul className="space-y-2 text-gray-600 mb-4">
            <li>• Update project status with structured data</li>
            <li>• Clients see progress instantly</li>
            <li>• Secure token-based access (no passwords!)</li>
            <li>• Professional reports that impress</li>
          </ul>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>Dad Joke Alert:</strong> Why do clients love Project Pulse? 
              Because they finally know what's happening without having to ask! 😄
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Enterprise-Grade Security",
      content: (
        <div>
          <div className="w-14 h-14 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">Your Data is Safe</h3>
          <ul className="space-y-2 text-gray-600 mb-4">
            <li>• Clients only see their own projects</li>
            <li>• Secure token links with expiration</li>
            <li>• Role-based access control</li>
            <li>• No passwords for clients to forget</li>
          </ul>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-800">
              <strong>Fun Fact:</strong> You can generate secure client links faster than 
              it takes to write "What's the project status?" email! ⚡
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Ready to Launch?",
      content: (
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">You're All Set!</h2>
          <p className="text-gray-600 mb-6">
            Start by creating your first project. Pick something exciting - maybe that project 
            that's been living in Excel sheets for too long?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-medium text-blue-900">Step 1: Create Project</div>
              <div className="text-blue-700">Add basic project details</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="font-medium text-green-900">Step 2: Build Roadmap</div>
              <div className="text-green-700">Drag tasks into timeline</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="font-medium text-purple-900">Step 3: Send Updates</div>
              <div className="text-purple-700">Keep everyone informed</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="font-medium text-orange-900">Step 4: Share with Client</div>
              <div className="text-orange-700">Generate secure access link</div>
            </div>
          </div>
        </div>
      )
    }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-800 rounded px-3 py-2">
                <div className="text-white font-bold">InfoWorks</div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Project Pulse Onboarding</h1>
                <p className="text-sm text-gray-500">Step {currentStep + 1} of {steps.length}</p>
              </div>
            </div>
            <button
              onClick={() => closeOnboarding(false)}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{steps[currentStep].title}</h2>
            {steps[currentStep].content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={() => closeOnboarding(true)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Skip Tour
            </button>
            <button
              onClick={nextStep}
              style={{ backgroundColor: '#1C2B45' }}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              {currentStep === steps.length - 1 ? "Let's Get Started!" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}