import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { User, PMUser } from './auth'

const secretKey = process.env.AUTH_SECRET || 'your-secret-key-change-in-production'
const key = new TextEncoder().encode(secretKey)

export interface SessionData {
  user: User
  pmUser: PMUser
}

export async function createSession(data: SessionData): Promise<string> {
  const payload = {
    user: data.user,
    pmUser: data.pmUser,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, key)
    return payload as SessionData
  } catch (err) {
    return null
  }
}

export async function setSessionCookie(sessionData: SessionData) {
  const token = await createSession(sessionData)
  const cookieStore = cookies()
  
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  })
}

export async function getSessionFromCookie(): Promise<SessionData | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  
  if (!token) {
    return null
  }
  
  return verifySession(token)
}

export function clearSessionCookie() {
  const cookieStore = cookies()
  cookieStore.delete('session')
}