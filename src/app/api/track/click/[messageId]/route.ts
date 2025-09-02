import { NextRequest, NextResponse } from 'next/server'
import { emailTrackingService } from '@/lib/email/tracking'

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const messageId = params.messageId
    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')

    if (!targetUrl) {
      return NextResponse.redirect('/')
    }

    // Extract tracking data
    const userAgent = request.headers.get('user-agent')
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Get message details to record the click
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/messages/${messageId}`, {
        headers: {
          'Authorization': request.headers.get('Authorization') || ''
        }
      })

      if (response.ok) {
        const message = await response.json()
        
        await emailTrackingService.recordEvent({
          messageId,
          ownerUid: message.owner_uid,
          clientId: message.client_id,
          event: 'clicked',
          eventData: {
            timestamp: new Date().toISOString(),
            targetUrl: decodeURIComponent(targetUrl),
            source: 'link'
          },
          userAgent: userAgent || undefined,
          ipAddress
        })

        console.log(`🔗 Email link clicked: ${messageId} -> ${targetUrl}`)
      }
    } catch (trackingError) {
      console.error('Failed to record click tracking:', trackingError)
      // Continue with redirect even if tracking fails
    }

    // Redirect to the target URL
    return NextResponse.redirect(decodeURIComponent(targetUrl))

  } catch (error) {
    console.error('Error processing click tracking:', error)
    
    // Fallback: try to redirect to target URL if available
    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')
    
    if (targetUrl) {
      return NextResponse.redirect(decodeURIComponent(targetUrl))
    }
    
    return NextResponse.redirect('/')
  }
}