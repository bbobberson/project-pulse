import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json().catch(() => ({}))
    const { executiveSummary } = body
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get the current user from the session
    const sb = await supabase()
    const { data: { user }, error: authError } = await sb.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has PM/admin access to this project
    const { data: project, error: projectError } = await sb
      .from('projects')
      .select('id, overall_status, pm_user_id, created_by, name, client_name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user has permission (is PM, creator, or admin)
    const { data: pmUser } = await sb
      .from('pm_users')
      .select('id, role')
      .eq('id', user.id)
      .single()

    const isAdmin = pmUser?.role === 'admin'
    const isPM = project.pm_user_id === user.id
    const isCreator = project.created_by === user.id

    if (!isAdmin && !isPM && !isCreator) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate current status - can only complete active projects
    const activeStatuses = ['on-track', 'at-risk', 'off-track']
    if (!activeStatuses.includes(project.overall_status)) {
      if (project.overall_status === 'completed') {
        return NextResponse.json({ error: 'Project is already completed' }, { status: 400 })
      }
      if (project.overall_status === 'archived') {
        return NextResponse.json({ error: 'Cannot complete archived project' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Project must be in active status to complete' }, { status: 400 })
    }

    // Update project status to completed
    const { data: updatedProject, error: updateError } = await sb
      .from('projects')
      .update({ 
        overall_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('Error completing project:', updateError)
      return NextResponse.json({ error: 'Failed to complete project' }, { status: 500 })
    }

    // Create completion snapshot (final pulse update)
    try {
      // Calculate current week number based on project start date
      const projectStartDate = new Date(updatedProject.start_date)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
      const currentWeek = Math.max(1, Math.ceil(daysDiff / 7))
      
      // Create completion pulse data
      const completionPulseData = {
        executive_summary: executiveSummary,
        next_steps: 'This project has been completed. No further action is required.',
        completed_tasks: [
          {
            name: 'Project Completion',
            category: 'Final Milestone',
            notes: 'All project deliverables have been completed and delivered to the client.'
          }
        ],
        in_progress_tasks: [],
        blocked_tasks: []
      }

      // Insert completion snapshot
      const { error: snapshotError } = await sb
        .from('weekly_snapshots')
        .insert({
          project_id: projectId,
          week_number: currentWeek,
          week_start_date: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
          tasks_data: completionPulseData,
          overall_status: 'completed',
          overall_summary: completionPulseData.executive_summary,
          status: 'completed',
          created_by: user.id
        })

      if (snapshotError) {
        console.error('Error creating completion snapshot:', snapshotError)
      } else {
        console.log('✅ Completion snapshot created successfully')
      }
    } catch (snapshotErr) {
      console.warn('Error creating completion snapshot:', snapshotErr)
      // Don't fail completion if snapshot creation fails
    }

    // Generate fresh client access tokens before sending notification (same as pulse updates)
    try {
      // Get a client user for this project to generate tokens (same logic as pulse updates)
      const { data: clientUsers, error: clientUsersError } = await sb
        .from('client_users')
        .select('email, name')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .eq('email_notifications', true)
        .limit(1)
        .single()
      
      if (!clientUsersError && clientUsers) {
        // Create token directly instead of calling API to avoid auth issues
        const crypto = require('crypto')
        const token = crypto.randomBytes(32).toString('base64url')
        
        // Calculate expiration date (30 days from now)
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        // Insert token directly into database
        const { error: tokenError } = await sb
          .from('client_access_tokens')
          .insert({
            token,
            project_id: projectId,
            client_name: clientUsers.name || 'Client User',
            client_email: clientUsers.email,
            expires_at: expiresAt.toISOString(),
            created_by: user.id,
            is_active: true
          })
        
        if (tokenError) {
          console.error('❌ Failed to create client access token for completion:', tokenError)
        } else {
          console.log('✅ Client access token created successfully for completion')
        }
      } else {
        console.log('No client users found with notifications enabled for project completion')
      }
    } catch (tokenError) {
      console.warn('Error generating client tokens:', tokenError)
      // Don't fail the completion if token generation fails
    }

    // Send final pulse notification to client users
    try {
      const finalPulseResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-pulse-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: projectId,
          isCompletionNotification: true
        })
      })

      if (!finalPulseResponse.ok) {
        console.warn('Failed to send completion notification:', await finalPulseResponse.text())
        // Don't fail the completion if notification fails
      }
    } catch (notificationError) {
      console.warn('Error sending completion notification:', notificationError)
      // Don't fail the completion if notification fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project completed successfully. Final notification sent to clients.',
      project: updatedProject 
    })

  } catch (error) {
    console.error('Error in complete project API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH endpoint for reactivating completed projects (completed -> active)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { reactivate } = await request.json()
    
    if (!reactivate) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get the current user from the session
    const sb = await supabase()
    const { data: { user }, error: authError } = await sb.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has PM/admin access to this project
    const { data: project, error: projectError } = await sb
      .from('projects')
      .select('id, overall_status, pm_user_id, created_by')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if user has permission (is PM, creator, or admin)
    const { data: pmUser } = await sb
      .from('pm_users')
      .select('id, role')
      .eq('id', user.id)
      .single()

    const isAdmin = pmUser?.role === 'admin'
    const isPM = project.pm_user_id === user.id
    const isCreator = project.created_by === user.id

    if (!isAdmin && !isPM && !isCreator) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Can only reactivate completed projects
    if (project.overall_status !== 'completed') {
      return NextResponse.json({ error: 'Only completed projects can be reactivated' }, { status: 400 })
    }

    // Reactivate project to on-track status
    const { data: updatedProject, error: updateError } = await sb
      .from('projects')
      .update({ 
        overall_status: 'on-track',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('Error reactivating project:', updateError)
      return NextResponse.json({ error: 'Failed to reactivate project' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project reactivated successfully',
      project: updatedProject 
    })

  } catch (error) {
    console.error('Error in reactivate project API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}