import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Request validation schema
const UpdateMessageSchema = z.object({
  type: z.enum(['followup', 'reminder', 'update']).optional(),
  tone: z.enum(['friendly', 'professional', 'firm']).optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  customContext: z.string().optional(),
})

// PUT /api/messages/[id] - Update existing message
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: messageId } = await params

    // Parse and validate request
    const body = await request.json()
    const updateData = UpdateMessageSchema.parse(body)

    // Check if message exists and belongs to user
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('id, owner_uid, status')
      .eq('id', messageId)
      .eq('owner_uid', user.id)
      .single()

    if (fetchError || !existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Only allow updating draft messages
    if (existingMessage.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only edit draft messages' },
        { status: 400 }
      )
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('owner_uid', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update message:', updateError)
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      )
    }

    // Log the update
    await supabase
      .from('audit_logs')
      .insert({
        owner_uid: user.id,
        action: 'update_message',
        entity_type: 'message',
        entity_id: messageId,
        delta_hash: null,
        ip_hash: hashIP(request.ip || 'unknown'),
      })

    return NextResponse.json({
      success: true,
      message: updatedMessage
    })

  } catch (error) {
    console.error('Message update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    )
  }
}

// DELETE /api/messages/[id] - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: messageId } = await params

    // Delete the message (only if it belongs to the user)
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('owner_uid', user.id)

    if (deleteError) {
      console.error('Failed to delete message:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 500 }
      )
    }

    // Log the deletion
    await supabase
      .from('audit_logs')
      .insert({
        owner_uid: user.id,
        action: 'delete_message',
        entity_type: 'message',
        entity_id: messageId,
        delta_hash: null,
        ip_hash: hashIP(request.ip || 'unknown'),
      })

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Message deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}

// Simple IP hashing for audit logs
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}