import bcrypt from 'bcryptjs'
import { supabaseAuth } from './supabase-auth'

export interface User {
  id: string
  email: string
}

export interface PMUser {
  id: string
  email: string
  full_name: string
  company: string
  role: string
  invite_status: string
  last_login?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createUser(email: string, password: string): Promise<{ user: User; error?: string }> {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabaseAuth
      .from('app_users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return { user: null as any, error: 'User already exists' }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const { data: user, error } = await supabaseAuth
      .from('app_users')
      .insert({
        email,
        password_hash: passwordHash
      })
      .select('id, email')
      .single()

    if (error) {
      return { user: null as any, error: error.message }
    }

    return { user }
  } catch (err) {
    console.error('Create user error:', err)
    return { user: null as any, error: 'Failed to create user' }
  }
}

export async function authenticateUser(email: string, password: string): Promise<{ user: User; pmUser: PMUser } | { error: string }> {
  try {
    // Get user from app_users
    const { data: user, error: userError } = await supabaseAuth
      .from('app_users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return { error: 'Invalid email or password' }
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return { error: 'Invalid email or password' }
    }

    // Get PM user data
    const { data: pmUser, error: pmError } = await supabaseAuth
      .from('pm_users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (pmError) {
      return { error: 'User profile not found' }
    }

    // Update last login
    await supabaseAuth
      .from('pm_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    return {
      user: { id: user.id, email: user.email },
      pmUser
    }
  } catch (err) {
    console.error('Authentication error:', err)
    return { error: 'Authentication failed' }
  }
}

export async function createPMUser(userId: string, email: string, fullName: string, invitation?: any): Promise<{ error?: string }> {
  try {
    const { error } = await supabaseAuth
      .from('pm_users')
      .insert({
        id: userId,
        email,
        full_name: invitation?.full_name || fullName,
        company: invitation?.company || 'InfoWorks',
        role: invitation?.role || 'pm',
        invite_status: 'accepted'
      })

    if (error) {
      console.error('PM user creation error:', error)
      return { error: error.message }
    }

    // Mark invitation as completed if it exists
    if (invitation) {
      await supabaseAuth
        .from('pm_invitations')
        .update({ invite_status: 'accepted' })
        .eq('email', email)
    }

    return {}
  } catch (err) {
    console.error('PM user creation error:', err)
    return { error: 'Failed to create PM user' }
  }
}