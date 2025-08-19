'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

export default function DebugDB() {
  const [tables, setTables] = useState<string>('')

  useEffect(() => {
    async function checkTables() {
      try {
        let result = 'Database Debug Info:\n\n'
        
        // Get a sample project ID first
        const { data: projects, error: projectError } = await supabase
          .from('projects')
          .select('id')
          .limit(1)
        
        if (projectError || !projects || projects.length === 0) {
          result += `No projects found to test with\n`
          setTables(result)
          return
        }

        const projectId = projects[0].id
        result += `Using project ID: ${projectId}\n\n`

        // Check what columns actually exist by doing a select
        const { data: sampleData, error: selectError } = await supabase
          .from('weekly_snapshots')
          .select('*')
          .limit(0)

        if (selectError) {
          result += `Select error: ${selectError.message}\n`
        } else {
          result += `weekly_snapshots table columns found!\n\n`
        }

        // Try to query system tables for column info
        const { data: columnInfo, error: columnError } = await supabase
          .from('information_schema.columns')
          .select('column_name, is_nullable, column_default')
          .eq('table_name', 'weekly_snapshots')

        if (columnError) {
          result += `Could not get column info: ${columnError.message}\n`
          // Fallback: try with core fields only
          const testData = {
            project_id: projectId,
            week_number: 1,
            week_start_date: '2025-08-17',
            overall_status: 'on-track',
            tasks_data: { test: 'data' },
            created_by: 'PM User',
            status: 'on-track' // Maybe both status and overall_status exist?
          }

          const { data, error } = await supabase
            .from('weekly_snapshots')
            .insert([testData])
            .select()

          if (error) {
            result += `\nInsert test error: ${error.message}\n`
            result += `Error details: ${JSON.stringify(error, null, 2)}\n`
          } else {
            result += `✅ Insert successful!\n`
            result += `Data: ${JSON.stringify(data, null, 2)}\n`
          }
        } else {
          result += `Column info: ${JSON.stringify(columnInfo, null, 2)}\n`
        }

        setTables(result)
      } catch (err) {
        setTables(`Error: ${err}`)
      }
    }
    checkTables()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Database Debug</h1>
        <pre className="bg-white p-4 rounded border text-sm text-gray-900">{tables}</pre>
        <a href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to Dashboard
        </a>
      </div>
    </div>
  )
}