import { NextResponse } from 'next/server'
import { supabaseAuth } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    const password = 'admin123'
    const hash = await bcrypt.hash(password, 12)
    
    const { error } = await supabaseAuth
      .from('app_users')
      .update({ password_hash: hash })
      .eq('email', 'jtrothman@gmail.com')
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin password reset to: admin123' 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}