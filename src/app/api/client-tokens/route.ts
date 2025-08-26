import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with cookies for server-side auth
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
        }
      }
    )

    // Verify PM authentication
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, clientEmail, clientName, expiresInDays = 30 } = body

    if (!projectId || !clientEmail) {
      return NextResponse.json({ error: 'Project ID and client email are required' }, { status: 400 })
    }

    // Verify PM has access to this project
    const { data: project, error: projectError } = await supabaseAuth
      .from('projects')
      .select('id, name, client_name')
      .eq('id', projectId)
      .eq('pm_user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Generate a secure token
    const crypto = require('crypto')
    const token = crypto.randomBytes(32).toString('base64url')
    
    // Calculate expiration date
    const expiresAt = new Date(Date.now() + (expiresInDays || 30) * 24 * 60 * 60 * 1000)

    // Save token to database
    const { error: insertError } = await supabaseAuth
      .from('client_access_tokens')
      .insert({
        token,
        project_id: projectId,
        client_email: clientEmail,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        is_active: true
      })

    if (insertError) {
      console.error('Token save error:', insertError)
      console.error('Insert data was:', {
        token,
        project_id: projectId,
        client_email: clientEmail,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        is_active: true
      })
      return NextResponse.json({ error: 'Failed to create token', details: insertError.message }, { status: 500 })
    }

    // Generate the client portal URL with token - use request origin or env var
    const requestUrl = new URL(request.url)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`
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
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
        }
      }
    )

    // Verify PM authentication
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Fetch existing tokens for the project  
    const { data: tokens, error: tokensError } = await supabaseAuth
      .from('client_access_tokens')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (tokensError) {
      console.error('Token fetch error:', tokensError)
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
    }
    
    return NextResponse.json({ tokens: tokens || [] })

  } catch (error) {
    console.error('Token fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}