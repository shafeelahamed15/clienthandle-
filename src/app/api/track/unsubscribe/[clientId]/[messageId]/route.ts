import { NextRequest, NextResponse } from 'next/server'
import { emailTrackingService } from '@/lib/email/tracking'
import { createClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string; messageId: string } }
) {
  try {
    const { clientId, messageId } = params
    const supabase = createClient()

    // Get client and message details for tracking
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('owner_uid, client_id')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      console.error('Message not found for unsubscribe:', messageId)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/error`)
    }

    // Extract tracking data
    const userAgent = request.headers.get('user-agent')
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Record unsubscribe event
    await emailTrackingService.recordUnsubscribe({
      messageId,
      ownerUid: message.owner_uid,
      clientId,
      event: 'complained',
      eventData: {
        timestamp: new Date().toISOString(),
        type: 'unsubscribe',
        source: 'email_link'
      },
      userAgent: userAgent || undefined,
      ipAddress
    })

    console.log(`✋ Client unsubscribed: ${clientId} via message ${messageId}`)

    // Redirect to unsubscribe confirmation page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/success?client=${clientId}`)

  } catch (error) {
    console.error('Error processing unsubscribe:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/error`)
  }
}