import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    // Check if email service is configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json({ 
        error: 'Email service not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD to environment variables.' 
      }, { status: 500 })
    }

    // Create Supabase client with cookies for server-side auth
    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check - User:', user?.id, 'Error:', authError)
    
    if (authError || !user) {
      console.log('No user found in session')
      return NextResponse.json({ error: 'Unauthorized - no user session' }, { status: 401 })
    }

    // Verify user is admin
    const { data: pmUser, error: pmError } = await supabase
      .from('pm_users')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('PM User lookup:', pmUser, 'Error:', pmError)

    if (pmError) {
      return NextResponse.json({ error: `Database error: ${pmError.message}` }, { status: 500 })
    }

    if (!pmUser || pmUser.role !== 'admin') {
      return NextResponse.json({ error: `Access denied. User role: ${pmUser?.role || 'none'}` }, { status: 403 })
    }

    const { email, fullName, company } = await request.json()

    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 })
    }

    // Generate invitation link using Supabase admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/signup`
      }
    })

    if (linkError) {
      console.error('Link generation error:', linkError)
      return NextResponse.json({ error: 'Failed to generate invitation link' }, { status: 500 })
    }

    const signupUrl = linkData.properties.action_link

    // Create Gmail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // Send the invitation email
    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Pulse - Your Invitation</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-top: 20px; margin-bottom: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { background-color: #1C2B45; color: white; padding: 15px 25px; border-radius: 8px; display: inline-block; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            h1 { color: #1C2B45; margin-bottom: 10px; }
            .intro-box { background-color: #f8f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #1C2B45; margin: 20px 0; }
            .beta-notice { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .cta-button { display: inline-block; background-color: #1C2B45; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">InfoWorks</div>
              <h1>Welcome to Project Pulse</h1>
            </div>
            
            <div class="intro-box">
              <h2 style="margin-top: 0;">You're Invited!</h2>
              <p>Hi ${fullName}! You've been invited to join Project Pulse - our new project management platform that's designed to make collaboration between teams and clients effortless.</p>
            </div>

            <h3>What makes Project Pulse different:</h3>
            <ul>
              <li><strong>Visual Roadmaps:</strong> Build and share project timelines with intuitive drag-and-drop tools</li>
              <li><strong>Client Transparency:</strong> Give clients real-time access to project progress without overwhelming them</li>
              <li><strong>Smart Updates:</strong> Weekly pulse reports that keep everyone in the loop</li>
              <li><strong>Secure Access:</strong> Each client gets private access to only their projects</li>
              <li><strong>Professional Presentation:</strong> Everything is designed to make you and your projects look great</li>
            </ul>

            <div class="beta-notice">
              <h3>Early Access Notice</h3>
              <p><strong>Project Pulse is currently in beta.</strong></p>
              <p>We're actively developing new features and polishing the experience. You might notice some areas that are still being refined, but the core functionality is solid and ready for real projects. Your feedback will help us make it even better!</p>
            </div>

            ${company ? `
            <p><strong>Ready to get started at ${company}?</strong><br>
            Set up your account and create your first project to see how Project Pulse can streamline your workflow.</p>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${signupUrl}" class="cta-button">
                Create Your Account
              </a>
            </div>

            <h3>Getting Started:</h3>
            <ol>
              <li><strong>Create your account</strong> using the button above</li>
              <li><strong>Set up your first project</strong> with basic details and timeline</li>
              <li><strong>Build your project roadmap</strong> using our visual timeline builder</li>
              <li><strong>Add client users</strong> and generate secure access links</li>
              <li><strong>Send weekly updates</strong> to keep everyone informed</li>
            </ol>

            <div class="footer">
              <p><strong>Questions or feedback?</strong><br>
              Feel free to reply to this email - we'd love to hear your thoughts as you explore the platform.</p>
              
              <p style="margin-top: 20px; font-style: italic; color: #888;">
                Thanks for being part of the Project Pulse beta. We're excited to see how it transforms your project management workflow.
              </p>
              
              <p style="margin-top: 15px; font-size: 12px; color: #999;">
                This invitation link will remain active, so bookmark it for easy access to your account setup.
              </p>
            </div>
          </div>
        </body>
        </html>
      `

    const info = await transporter.sendMail({
      from: `"Josh from InfoWorks" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Project Pulse Invitation - Join Our Beta (from Josh)',
      html: emailHtml,
    })

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Invitation email sent successfully!' 
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}