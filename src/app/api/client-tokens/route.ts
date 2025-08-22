import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
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

    const { projectId, clientEmail, expiresInDays = 30 } = await request.json()

    if (!projectId || !clientEmail) {
      return NextResponse.json({ error: 'Project ID and client email are required' }, { status: 400 })
    }

    // Verify PM has access to this project
    const supabaseClient = await supabase()
    const { data: project, error: projectError } = await supabaseClient
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
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

    // For now, let's skip database storage and just return the token
    // TODO: Create client_access_tokens table in Supabase dashboard
    console.log('Generated token for testing:', token)
    console.log('Project:', projectId, 'Client:', clientEmail)

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

    // For now, return empty tokens array until table is created
    // TODO: Uncomment when client_access_tokens table exists
    console.log('Fetching tokens for project:', projectId)
    
    return NextResponse.json({ tokens: [] })

  } catch (error) {
    console.error('Token fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}