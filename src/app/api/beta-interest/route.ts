import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }

    const supabaseClient = await supabase()

    // Check if email already exists
    const { data: existing } = await supabaseClient
      .from('beta_signups')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Thanks! We already have your email and will be in touch soon.' 
      })
    }

    // Insert new beta signup
    const { error: insertError } = await supabaseClient
      .from('beta_signups')
      .insert({
        email: email.toLowerCase(),
        created_at: new Date().toISOString(),
        source: 'login_page'
      })

    if (insertError) {
      console.error('Beta signup insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save signup' }, { status: 500 })
    }

    // Send notification email to you
    try {
      await resend.emails.send({
        from: 'pulse@send.rothman.fit',
        to: 'josh.rothman@infoworks-tn.com',
        subject: '🎯 INCOMING! Someone wants Project Pulse (and they found your secret login page)',
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1C2B45 0%, #2A3F5F 100%); padding: 30px; border-radius: 12px; color: white; text-align: center; margin-bottom: 30px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🚨 LEAD ALERT! 🚨</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Someone discovered your professional login page and wants IN!</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1C2B45; margin: 0 0 15px 0; font-size: 18px;">🎣 The Catch:</h2>
              <p style="margin: 8px 0; color: #495057; font-size: 16px;"><strong>📧 Email:</strong> ${email}</p>
              <p style="margin: 8px 0; color: #495057;"><strong>🎯 Source:</strong> Login Page (they found your professional domain!)</p>
              <p style="margin: 8px 0; color: #495057;"><strong>⏰ When:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 8px 0; color: #495057;"><strong>🌟 Coolness Level:</strong> Found pulse.rothman.fit and clicked the subtle link</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: white; font-size: 18px;">🎉 Victory Dance Time!</h3>
              <p style="margin: 0; color: white; opacity: 0.95; font-size: 14px;">
                Your Tesla-inspired beta capture is working! This person saw "Interested in early access?" 
                and couldn't resist clicking. That's some quality lead generation right there! 🎯
              </p>
            </div>
            
            <div style="background: #fff7ed; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">🤔 What's Next, Captain?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>Send them a cool "thanks for your interest" email</li>
                <li>Add them to your future marketing campaigns</li>
                <li>Maybe invite them to be a beta tester when ready?</li>
                <li>Or just admire how smooth your login page lead capture is! 😎</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; font-weight: 600;">
                🏆 Lead Generation Status: CRUSHING IT
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Project Pulse • Transparency. Delivered. • <a href="https://pulse.rothman.fit" style="color: #1C2B45; text-decoration: none;">pulse.rothman.fit</a>
              </p>
            </div>
          </div>
        `
      })
    } catch (emailError) {
      console.error('Beta signup notification email error:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Thanks for your interest! We\'ll be in touch soon.' 
    })

  } catch (error) {
    console.error('Beta signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}