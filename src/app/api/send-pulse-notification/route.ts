import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAuth } from '@/lib/supabase-server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { projectId, weekNumber } = await request.json()

    console.log('Received email notification request:', { projectId, weekNumber })

    if (!projectId || !weekNumber) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Get project details
    const { data: project, error: projectError } = await supabaseAuth
      .from('projects')
      .select('name, client_name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('Error fetching project:', projectError)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get client users with notifications enabled
    const { data: clientUsers, error: clientUsersError } = await supabaseAuth
      .from('client_users')
      .select('email, name')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .eq('email_notifications', true)

    if (clientUsersError) {
      console.error('Error fetching client users:', clientUsersError)
      return NextResponse.json({ error: 'Error fetching client users' }, { status: 500 })
    }

    if (!clientUsers || clientUsers.length === 0) {
      return NextResponse.json({ message: 'No clients with notifications enabled' })
    }

    // Generate client portal link with token (we'll need to get a valid token)
    const { data: tokens, error: tokenError } = await supabaseAuth
      .from('client_access_tokens')
      .select('token')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .limit(1)

    if (tokenError || !tokens || tokens.length === 0) {
      console.error('No active client token found for project:', projectId)
      return NextResponse.json({ error: 'No active client access token found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const portalLink = `${baseUrl}/client?token=${tokens[0].token}`

    // Send emails sequentially with rate limiting to respect Resend's 2 req/sec limit
    const results = []
    for (let index = 0; index < clientUsers.length; index++) {
      const user = clientUsers[index]
      
      // Add delay between emails (except for the first one)
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 600)) // 600ms delay between emails
      }
      const emailHtml = `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Project Pulse — ${project.name}</title>
        </head>
        <body style="margin: 0; padding: 0; width: 100% !important; min-width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); background-color: #f8fafc;">
          
          <!-- Wrapper Table -->
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); background-color: #f8fafc; min-height: 100vh; padding: 40px 20px;">
            <tr>
              <td align="center" valign="top">
                
                <!-- Main Container -->
                <table cellpadding="0" cellspacing="0" border="0" width="640" style="max-width: 640px; background-color: #ffffff; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
                  
                  <!-- Hero Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%); background-color: #1e293b; padding: 60px 40px; text-align: center; position: relative;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="text-align: center;">
                            <!-- Logo/Brand -->
                            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 30px auto;">
                              <tr>
                                <td style="background-color: rgba(255, 255, 255, 0.1); padding: 20px 32px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); text-align: center;">
                                  <img src="${baseUrl}/infoworks-logo.png" alt="InfoWorks Logo" width="140" height="48" style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
                                </td>
                              </tr>
                            </table>
                            
                            <!-- Hero Title -->
                            <h2 style="margin: 0 0 16px 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -1px; line-height: 1.2;">Project Pulse</h2>
                            <p style="margin: 0; color: #cbd5e1; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Transparency. Delivered.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Content Section -->
                  <tr>
                    <td style="padding: 60px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td>
                            <!-- Personal Greeting -->
                            <h3 style="margin: 0 0 24px 0; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 700; line-height: 1.3;">Hello ${user.name},</h3>
                            
                            <!-- Main Message -->
                            <p style="margin: 0 0 32px 0; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; line-height: 1.7; font-weight: 400;">
                              Welcome to the future of project transparency. Your project <strong style="color: #1e293b; font-weight: 600;">${project.name}</strong> has a fresh update waiting in your private portal.
                            </p>
                            
                            <!-- Value Proposition -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 40px 0;">
                              <tr>
                                <td style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); background-color: #f1f5f9; padding: 32px; border-radius: 12px; border-left: 4px solid #1e293b;">
                                  <p style="margin: 0 0 16px 0; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 600; line-height: 1.5;">Experience project management reimagined:</p>
                                  <p style="margin: 0; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.6; font-weight: 400;">Real-time insights, milestone tracking, and seamless communication—all designed to keep you in perfect sync with your project's progress.</p>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="text-align: center; padding: 20px 0;">
                                  <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                                    <tr>
                                      <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); background-color: #1e293b; padding: 20px 48px; text-align: center; border-radius: 12px; border: 2px solid transparent; box-shadow: 0 4px 14px 0 rgba(30, 41, 59, 0.3);">
                                        <a href="${portalLink}" style="color: #ffffff; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: 700; display: block; letter-spacing: 0.5px;">View Your Update →</a>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- Secondary Message -->
                            <p style="margin: 40px 0 0 0; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.6; text-align: center; font-style: italic;">
                              Your dedicated portal provides instant access to project milestones, timeline updates, and progress insights—available 24/7.
                            </p>
                            
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Premium Footer -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); background-color: #f8fafc; padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="text-align: center;">
                            <p style="margin: 0 0 12px 0; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 1px;">INFOWORKS</p>
                            <p style="margin: 0; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">Transparency. Delivered.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                </table>
                
                <!-- Email Footer Info -->
                <table cellpadding="0" cellspacing="0" border="0" width="640" style="max-width: 640px; margin: 30px auto 0 auto;">
                  <tr>
                    <td style="text-align: center; padding: 20px;">
                      <p style="margin: 0; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; line-height: 1.4;">
                        You're receiving this because you have access to ${project.name} updates.<br>
                        This is an automated notification from Project Pulse.
                      </p>
                    </td>
                  </tr>
                </table>
                
              </td>
            </tr>
          </table>
          
        </body>
        </html>
      `

      try {
        const result = await resend.emails.send({
          from: 'Project Pulse <pulse@send.rothman.fit>',
          to: user.email,
          subject: `Project Update: ${project.name} - Week ${weekNumber}`,
          html: emailHtml,
        })
        
        console.log(`✅ Email sent to ${user.email}:`, result)
        results.push({ status: 'fulfilled', value: result, email: user.email })
        
      } catch (error) {
        console.error(`❌ Email failed for ${user.email}:`, error)
        results.push({ status: 'rejected', reason: error, email: user.email })
      }
    }

    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected')

    if (failed.length > 0) {
      console.error('Failed emails summary:', failed.map(f => ({ email: f.email, error: f.reason })))
    }

    return NextResponse.json({ 
      message: `Sent ${successful} of ${clientUsers.length} notification emails`,
      recipients: clientUsers.map(user => ({ name: user.name, email: user.email })),
      failures: failed.length,
      results: results.map(result => ({
        email: result.email,
        status: result.status,
        error: result.status === 'rejected' ? result.reason : null
      }))
    })

  } catch (error) {
    console.error('Error in send-pulse-notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}