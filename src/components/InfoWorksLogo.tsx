interface InfoWorksLogoProps {
  className?: string
  width?: number
  height?: number
}

export default function InfoWorksLogo({ className = "", width = 120, height = 40 }: InfoWorksLogoProps) {
  return (
    <div className="bg-slate-800 rounded px-3 py-2">
      <img
        src="/infoworks-logo.png"
        alt="InfoWorks Logo"
        width={width}
        height={height}
        className={className}
        style={{ objectFit: 'contain' }}
      />
    </div>
  )
}