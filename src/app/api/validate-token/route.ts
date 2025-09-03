import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabaseClient = await supabase()
    
    // Look up the token in the database
    console.log('🔍 Searching for token:', token.substring(0, 10) + '...')
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('client_access_tokens')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    console.log('🔍 Token query result:', { tokenData, tokenError })

    if (tokenError || !tokenData) {
      console.log('❌ Token validation failed:', tokenError?.message || 'No token data found')
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Check if token is expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 401 })
    }

    // Get the project associated with this token
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', tokenData.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update last_accessed timestamp
    await supabaseClient
      .from('client_access_tokens')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', tokenData.id)

    return NextResponse.json({
      success: true,
      tokenData: {
        projectId: project.id,
        clientEmail: tokenData.client_email,
        expiresAt: tokenData.expires_at
      },
      project: project
    })

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}