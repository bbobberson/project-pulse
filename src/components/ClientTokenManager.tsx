'use client'

import { useRouter } from 'next/navigation'

interface ClientTokenManagerProps {
  projectId: string
  projectName: string
  clientName: string
}

export default function ClientTokenManager({ projectId }: ClientTokenManagerProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(`/dashboard/${projectId}/client-access`)}
      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
    >
      🔗 Manage Client Access
    </button>
  )
}