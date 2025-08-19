import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Validate token using the database function
    const { data: tokenResult, error: tokenError } = await supabase
      .rpc('validate_client_token', { p_token: token })

    if (tokenError) {
      console.error('Token validation error:', tokenError)
      return NextResponse.json({ error: 'Failed to validate token' }, { status: 500 })
    }

    if (!tokenResult || tokenResult.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const validatedToken = tokenResult[0]
    
    // Fetch the project data
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', validatedToken.project_id)
      .single()

    if (projectError || !projectData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      tokenData: {
        projectId: validatedToken.project_id,
        clientEmail: validatedToken.client_email,
        expiresAt: validatedToken.expires_at
      },
      project: projectData
    })

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}