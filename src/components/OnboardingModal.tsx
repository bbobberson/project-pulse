'use client'

import { useState, useEffect } from 'react'
import InfoWorksLogo from './InfoWorksLogo'

interface OnboardingModalProps {
  userEmail: string
}

export default function OnboardingModal({ userEmail }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Only show onboarding on first load of dashboard, not navigation
    const hasBeenDismissed = localStorage.getItem(`onboarding_dismissed_${userEmail}`)
    const hasShownThisSession = sessionStorage.getItem(`onboarding_shown_${userEmail}`)
    
    if (!hasBeenDismissed && !hasShownThisSession) {
      setIsOpen(true)
      sessionStorage.setItem(`onboarding_shown_${userEmail}`, 'true')
    }
  }, [userEmail])

  const closeOnboarding = (dismissForever = false) => {
    if (dismissForever) {
      localStorage.setItem(`onboarding_dismissed_${userEmail}`, 'true')
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
          <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Project Pulse</h2>
          <p className="text-gray-600 mb-4">
            Streamline your project management with intuitive tools designed for modern teams. 
            Clear communication, structured workflows, and real-time visibility.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Beta Release:</strong> You're accessing an early version with core functionality. 
              Your feedback helps us refine the experience.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Build Beautiful Roadmaps",
      content: (
        <div>
          <div className="w-14 h-14 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-sm text-blue-800">
              <strong>Get Started:</strong> Our task library includes comprehensive templates 
              from initial discovery through project completion.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Real-Time Client Updates",
      content: (
        <div>
          <div className="w-14 h-14 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-sm text-green-800">
              <strong>Client Benefits:</strong> Automated updates eliminate status meetings 
              and reduce project communication overhead significantly.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Your Data is Safe",
      content: (
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Enterprise-Grade Security</h3>
          <ul className="space-y-2 text-gray-600 mb-4">
            <li>• Clients only see their own projects</li>
            <li>• Secure token links with expiration</li>
            <li>• Role-based access control</li>
            <li>• No passwords for clients to forget</li>
          </ul>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-sm text-purple-800">
              <strong>Efficiency Gain:</strong> Generate secure client access links instantly, 
              eliminating manual status report preparation and delivery.
            </p>
          </div>
        </div>
      )
    }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <InfoWorksLogo width={100} height={30} />
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
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div 
              className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{steps[currentStep].title}</h2>
            {steps[currentStep].content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            ← Previous
          </button>
          
          <div className="flex space-x-3 items-center">
            {currentStep === steps.length - 1 ? (
              <>
                <label className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 cursor-pointer">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        closeOnboarding(true)
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus-brand"
                  />
                  <span className="text-sm">Don't show again</span>
                </label>
                <button
                  onClick={() => closeOnboarding(false)}
                  style={{ backgroundColor: '#1C2B45' }}
                  className="px-6 py-2 text-white rounded-xl hover:opacity-90 transition-opacity cursor-pointer font-medium"
                >
                  Get Started
                </button>
              </>
            ) : (
              <button
                onClick={nextStep}
                style={{ backgroundColor: '#1C2B45' }}
                className="px-6 py-2 text-white rounded-xl hover:opacity-90 transition-opacity cursor-pointer font-medium"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}