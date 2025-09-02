import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Create client with public anon key for auth operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Use Supabase's built-in password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/reset-password`,
    })

    if (error) {
      console.error('Password reset error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error
      })
      return NextResponse.json({ 
        error: `Password reset failed: ${error.message}`,
        code: error.code,
        status: error.status
      }, { status: 500 })
    }

    return NextResponse.json({ message: 'Password reset email sent' })
  } catch (error) {
    console.error('Error in reset-password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}