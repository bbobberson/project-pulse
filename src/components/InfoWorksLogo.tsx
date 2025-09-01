interface InfoWorksLogoProps {
  className?: string
  width?: number
  height?: number
  mode?: 'present' | 'future'
}

export default function InfoWorksLogo({ className = "", width = 120, height = 40, mode = 'present' }: InfoWorksLogoProps) {
  // Use new SVG logo for Present Mode, keep original for Future Mode
  const logoSrc = mode === 'present' ? '/infoworks-logo.svg' : '/infoworks-logo.png'
  
  return (
    <div className={mode === 'present' ? "" : "bg-slate-800 rounded px-3 py-2"}>
      <img
        src={logoSrc}
        alt="InfoWorks Logo"
        width={width}
        height={height}
        className={className}
        style={{ objectFit: 'contain' }}
      />
    </div>
  )
}