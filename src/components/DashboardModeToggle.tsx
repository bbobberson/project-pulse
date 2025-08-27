'use client'

import { motion } from 'framer-motion'

interface DashboardModeToggleProps {
  mode: 'present' | 'future'
  onToggle: (mode: 'present' | 'future') => void
}

export default function DashboardModeToggle({ mode, onToggle }: DashboardModeToggleProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onToggle('present')}
          className={`relative px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
            mode === 'present'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white/10 text-gray-600 hover:bg-white/20'
          }`}
        >
          Present Mode
          {mode === 'present' && (
            <motion.div
              layoutId="activeMode"
              className="absolute inset-0 rounded-2xl bg-blue-600"
              style={{ zIndex: -1 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onToggle('future')}
          className={`relative px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
            mode === 'future'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
              : 'bg-white/10 text-gray-600 hover:bg-white/20'
          }`}
        >
          <span className="relative z-10">Future Mode</span>
          {mode === 'future' && (
            <motion.div
              layoutId="activeMode"
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600"
              style={{ zIndex: -1 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {mode === 'future' && (
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(147, 51, 234, 0.3)",
                  "0 0 40px rgba(147, 51, 234, 0.5)",
                  "0 0 20px rgba(147, 51, 234, 0.3)"
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.button>
      </div>
      
      <div className="text-sm text-gray-500">
        {mode === 'present' ? 'Standard Dashboard View' : 'Cosmic Universe View'}
      </div>
    </div>
  )
}