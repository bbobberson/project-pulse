import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with cookies for server-side auth  
    const supabaseClient = supabase()
    
    // Verify PM authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, clientEmail, expiresInDays = 30 } = await request.json()

    if (!projectId || !clientEmail) {
      return NextResponse.json({ error: 'Project ID and client email are required' }, { status: 400 })
    }

    // Verify PM has access to this project
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, name, client_name')
      .eq('id', projectId)
      .eq('pm_user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Create access token using the database function
    const { data: tokenResult, error: tokenError } = await supabase
      .rpc('create_client_access_token', {
        p_project_id: projectId,
        p_client_email: clientEmail,
        p_created_by: user.id,
        p_expires_in_days: expiresInDays
      })

    if (tokenError) {
      console.error('Error creating token:', tokenError)
      return NextResponse.json({ error: 'Failed to create access token' }, { status: 500 })
    }

    const token = tokenResult

    // Generate the client portal URL with token
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const clientUrl = `${baseUrl}/client?token=${token}`

    return NextResponse.json({
      success: true,
      token,
      clientUrl,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
      project: {
        id: project.id,
        name: project.name,
        clientName: project.client_name
      }
    })

  } catch (error) {
    console.error('Token creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with cookies for server-side auth
    const supabaseClient = supabase()

    // Verify PM authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify PM has access to this project and get tokens
    const { data: tokens, error } = await supabaseClient
      .from('client_access_tokens')
      .select(`
        id,
        token,
        client_email,
        expires_at,
        created_at,
        last_used_at,
        is_active,
        projects!inner(id, name, pm_user_id)
      `)
      .eq('project_id', projectId)
      .eq('projects.pm_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tokens:', error)
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
    }

    return NextResponse.json({ tokens })

  } catch (error) {
    console.error('Token fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}