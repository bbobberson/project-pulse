interface ProjectPulseLogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ProjectPulseLogo({ 
  className = "", 
  showText = true, 
  size = 'md' 
}: ProjectPulseLogoProps) {
  const dimensions = {
    sm: { logo: { w: 32, h: 16 }, text: 'text-lg' },
    md: { logo: { w: 48, h: 24 }, text: 'text-xl' },
    lg: { logo: { w: 64, h: 32 }, text: 'text-2xl' }
  }
  
  const { logo, text } = dimensions[size]
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        width={logo.w} 
        height={logo.h} 
        viewBox="0 0 32 24" 
        className="flex-shrink-0"
      >
        {/* Simple "P" */}
        <path 
          fill="#003399" 
          d="M8,6 L8,18 L10,18 L10,13 L14,13 L14,11 L10,11 L10,8 L16,8 L16,6 Z"
        />
        {/* Clean pulse dot */}
        <circle fill="#003399" cx="20" cy="12" r="2"/>
        <circle fill="#003399" cx="26" cy="12" r="1.5" opacity="0.6"/>
      </svg>
      {showText && (
        <span className={`font-bold text-gray-900 ${text}`}>
          Project Pulse
        </span>
      )}
    </div>
  )
}