import { NextRequest, NextResponse } from 'next/server'
import { emailTrackingService } from '@/lib/email/tracking'

// 1x1 transparent gif pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const messageId = params.messageId.replace('.gif', '') // Remove .gif extension
    
    // Extract additional tracking data
    const userAgent = request.headers.get('user-agent')
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Record the open event - need to get message details first
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
        event: 'opened',
        eventData: {
          timestamp: new Date().toISOString(),
          source: 'pixel'
        },
        userAgent: userAgent || undefined,
        ipAddress
      })

      console.log(`📊 Email opened: ${messageId}`)
    }

    // Always return the tracking pixel, even if logging failed
    return new NextResponse(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': TRACKING_PIXEL.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Error tracking email open:', error)
    
    // Still return the pixel
    return new NextResponse(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': TRACKING_PIXEL.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}