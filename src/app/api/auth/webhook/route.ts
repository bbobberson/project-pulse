import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { eventType, record } = await req.json();
    
    if (eventType === 'user.created') {
      // Create PM user record
      await svc.from('pm_users').upsert([{
        id: record.id,
        email: record.email,
        full_name: record.user_metadata?.full_name || '',
        role: 'manager',
        is_active: true,
        invite_status: 'accepted'
      }]);
      
      // Mark invitation as accepted
      await svc.from('pm_invitations')
               .update({ invite_status: 'accepted' })
               .eq('email', record.email);
      
      console.log('✅ PM user created for:', record.email);
    }
    
    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}