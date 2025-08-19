'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'

export default function TestDB() {
  const [projects, setProjects] = useState<any[]>([])
  const [clientUsers, setClientUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testDB() {
      try {
        // Test projects table
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .limit(3)
        
        console.log('Projects query result:', { projectsData, projectsError })
        
        // Test client_users table
        const { data: clientUsersData, error: clientUsersError } = await supabase
          .from('client_users')
          .select('*')
        
        console.log('Client users query result:', { clientUsersData, clientUsersError })
        
        setProjects(projectsData || [])
        setClientUsers(clientUsersData || [])
        
      } catch (err) {
        console.error('Test error:', err)
      } finally {
        setLoading(false)
      }
    }
    
    testDB()
  }, [])

  if (loading) {
    return <div className="p-8">Testing database connection...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Projects ({projects.length})</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(projects, null, 2)}
        </pre>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Client Users ({clientUsers.length})</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(clientUsers, null, 2)}
        </pre>
      </div>
    </div>
  )
}