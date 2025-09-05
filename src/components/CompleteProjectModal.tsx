'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CompleteProjectModalProps {
  isOpen: boolean
  projectName: string
  clientName: string
  onConfirm: (executiveSummary: string) => void
  onCancel: () => void
  loading?: boolean
}

export default function CompleteProjectModal({
  isOpen,
  projectName,
  clientName,
  onConfirm,
  onCancel,
  loading = false
}: CompleteProjectModalProps) {
  const [executiveSummary, setExecutiveSummary] = useState('')

  if (!isOpen) return null

  const handleConfirm = () => {
    const trimmedSummary = executiveSummary.trim()
    if (trimmedSummary) {
      onConfirm(trimmedSummary)
    }
  }

  const isValid = executiveSummary.trim().length > 0

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl"
        >
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-green-100">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
            Complete Project
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-center mb-6 leading-relaxed">
            Mark <strong>"{projectName}"</strong> as completed. This indicates the project is closed out. 
            Please make sure all tasks are updated before continuing. A final pulse notification 
            will be sent to the client with your message below.
          </p>

          {/* Executive Summary Input */}
          <div className="mb-6">
            <label htmlFor="executive-summary" className="block text-sm font-medium text-gray-700 mb-2">
              Final Executive Summary
            </label>
            <textarea
              id="executive-summary"
              rows={4}
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              placeholder="Write a personalized completion message for the client..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !isValid}
              className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed btn-primary"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Completing...
                </div>
              ) : (
                'Complete Project'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}