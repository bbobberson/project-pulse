import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client that bypasses RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    // Create user with admin client - this bypasses email confirmation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Force email as confirmed
      user_metadata: {
        full_name: fullName
      }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Get invitation details if this user was invited
    const { data: invitation } = await supabaseAdmin
      .from('pm_invitations')
      .select('*')
      .eq('email', email)
      .single()

    // Create pm_users record
    const pmUserData = {
      id: authData.user.id,
      email: email,
      full_name: invitation?.full_name || fullName,
      company: invitation?.company || 'InfoWorks',
      role: invitation?.role || 'pm',
      invite_status: 'accepted'
    }

    const { error: createError } = await supabaseAdmin
      .from('pm_users')
      .insert(pmUserData)

    if (createError) {
      console.error('Error creating pm_users record:', createError)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    // Mark invitation as completed if it exists
    if (invitation) {
      await supabaseAdmin
        .from('pm_invitations')
        .update({ invite_status: 'accepted' })
        .eq('email', email)
    }

    return NextResponse.json({ 
      data: { user: authData.user },
      error: null 
    })

  } catch (err) {
    console.error('User creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}