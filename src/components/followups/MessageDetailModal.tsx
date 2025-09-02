'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import { 
  CopyIcon, 
  EditIcon, 
  SendIcon, 
  DeleteIcon,
  UsersIcon,
  ClockIcon,
  BillingIcon,
  MessagesIcon
} from '@/components/icons'

interface FollowupMessage {
  id: string
  client_id: string
  type: 'followup' | 'reminder' | 'update'
  tone: 'friendly' | 'professional' | 'firm'
  channel: 'email' | 'whatsapp'
  subject?: string
  body: string
  status: 'draft' | 'queued' | 'sent' | 'failed'
  scheduled_at?: string
  sent_at?: string
  created_at: string
  clients?: {
    name: string
    email: string
  }
  related_invoice_id?: string
  invoices?: {
    number: string
    amount_cents: number
    currency: string
  }
}

interface MessageDetailModalProps {
  message: FollowupMessage | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onSend?: (messageId: string) => void
}

export function MessageDetailModal({
  message,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onSend
}: MessageDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { addToast } = useToast()

  if (!message) return null

  const handleStartEdit = () => {
    setEditedSubject(message.subject || '')
    setEditedBody(message.body)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!message || !editedBody.trim()) {
      addToast({
        type: 'error',
        description: 'Message body cannot be empty'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const response = await fetch(`/api/followups/${message.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: editedSubject || undefined,
          body: editedBody.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save changes');
      }

      // Update the parent component if callback provided
      onEdit?.(message.id);
      
      setIsEditing(false);
      
      addToast({
        type: 'success',
        description: 'Message updated successfully'
      });
      
    } catch (error) {
      console.error('❌ Failed to save changes:', error);
      addToast({
        type: 'error',
        description: error instanceof Error ? error.message : 'Failed to save changes'
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleCancelEdit = () => {
    setEditedSubject(message.subject || '')
    setEditedBody(message.body)
    setIsEditing(false)
  }

  const handleCopyMessage = () => {
    const textToCopy = message.subject 
      ? `Subject: ${message.subject}\n\n${message.body}`
      : message.body
    navigator.clipboard.writeText(textToCopy)
    addToast({
      type: 'success',
      description: 'Message copied to clipboard'
    });
  }

  const formatAmount = (amountCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amountCents / 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-50 border-green-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      case 'queued': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getToneEmoji = (tone: string) => {
    switch (tone) {
      case 'friendly': return '😊'
      case 'professional': return '👔'
      case 'firm': return '📋'
      default: return '📝'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-0 shadow-apple-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <MessagesIcon size="md" className="text-blue-600" />
            Message Details
          </DialogTitle>
          <DialogDescription>
            View and manage your follow-up message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Message Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UsersIcon size="sm" className="text-gray-500" />
              <div>
                <p className="font-medium">{message.clients?.name}</p>
                <p className="text-sm text-gray-500">{message.clients?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(message.status)}>
                {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
              </Badge>
              <Badge variant="outline">
                {getToneEmoji(message.tone)} {message.tone}
              </Badge>
              <Badge variant="outline">
                {message.type.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Invoice Info */}
          {message.related_invoice_id && message.invoices && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <BillingIcon size="sm" className="text-blue-600" />
                <span className="font-medium text-blue-900">Related Invoice</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>#{message.invoices.number}</span>
                <span className="font-medium">
                  {formatAmount(message.invoices.amount_cents, message.invoices.currency)}
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Message Content */}
          <div className="space-y-4">
            {/* Subject */}
            {message.subject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg border text-sm">
                    {message.subject}
                  </p>
                )}
              </div>
            )}

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body
              </label>
              {isEditing ? (
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-lg border whitespace-pre-wrap text-sm">
                  {message.body}
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <ClockIcon size="sm" />
              <div>
                <p className="font-medium">Created</p>
                <p>{new Date(message.created_at).toLocaleString()}</p>
              </div>
            </div>
            {message.scheduled_at && (
              <div className="flex items-center gap-2">
                <ClockIcon size="sm" />
                <div>
                  <p className="font-medium">Scheduled</p>
                  <p>{new Date(message.scheduled_at).toLocaleString()}</p>
                </div>
              </div>
            )}
            {message.sent_at && (
              <div className="flex items-center gap-2">
                <SendIcon size="sm" />
                <div>
                  <p className="font-medium">Sent</p>
                  <p>{new Date(message.sent_at).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyMessage}>
                <CopyIcon size="sm" className="mr-2" />
                Copy Message
              </Button>
              
              {message.status === 'draft' && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.href = `/followups?editMessage=${message.id}`}
                  >
                    <EditIcon size="sm" className="mr-2" />
                    Edit in Composer
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={isEditing ? handleCancelEdit : handleStartEdit}
                    disabled={isSaving}
                  >
                    <EditIcon size="sm" className="mr-2" />
                    {isEditing ? 'Cancel' : 'Quick Edit'}
                  </Button>
                </>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing && (
                <Button 
                  size="sm" 
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editedBody.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
              
              {!isEditing && message.status === 'draft' && (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => onSend?.(message.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <SendIcon size="sm" className="mr-2" />
                    Send Now
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onDelete?.(message.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <DeleteIcon size="sm" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}