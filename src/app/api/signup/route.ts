import { NextRequest, NextResponse } from 'next/server'
import { supabaseAuth } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    // Get invitation details if this user was invited
    const { data: invitation } = await supabaseAuth
      .from('pm_invitations')
      .select('*')
      .eq('email', email)
      .single()

    // Create user with Supabase admin (this creates auth.users record)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: invitation?.full_name || fullName
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Now create pm_user record using the auth user ID
    const { error: pmUserError } = await supabaseAuth
      .from('pm_users')
      .insert({
        id: authData.user.id,
        email,
        full_name: invitation?.full_name || fullName,
        company: invitation?.company || 'InfoWorks',
        role: invitation?.role || 'pm',
        invite_status: 'accepted'
      })

    if (pmUserError) {
      console.error('PM User creation error:', pmUserError)
      return NextResponse.json({ error: pmUserError.message }, { status: 500 })
    }

    // Mark invitation as completed if it exists
    if (invitation) {
      await supabaseAuth
        .from('pm_invitations')
        .update({ invite_status: 'accepted' })
        .eq('id', invitation.id)
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: authData.user.id,
        email,
        name: invitation?.full_name || fullName
      }
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}