import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    
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

    // Validate current status - cannot archive already archived projects
    if (project.overall_status === 'archived') {
      return NextResponse.json({ error: 'Project is already archived' }, { status: 400 })
    }

    // Update project status to archived
    const { data: updatedProject, error: updateError } = await sb
      .from('projects')
      .update({ 
        overall_status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('Error archiving project:', updateError)
      return NextResponse.json({ error: 'Failed to archive project' }, { status: 500 })
    }

    // Note: Archived projects are removed from UI but remain in database for audit purposes
    // No notification is sent as this is typically for mistakes or inactive clients

    return NextResponse.json({ 
      success: true, 
      message: 'Project archived successfully',
      project: updatedProject 
    })

  } catch (error) {
    console.error('Error in archive project API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}