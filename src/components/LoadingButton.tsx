'use client'

import { motion } from 'framer-motion'

interface LoadingButtonProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  className?: string
}

export default function LoadingButton({
  loading,
  children,
  loadingText = 'Loading...',
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = ''
}: LoadingButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  }

  const isDisabled = loading || disabled

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <>
          <svg 
            className="animate-spin -ml-1 mr-3 h-5 w-5" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText}
        </>
      ) : (
        children
      )}
    </motion.button>
  )
}