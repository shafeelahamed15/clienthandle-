'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LoadingState } from '@/components/common/LoadingState'
import { EmailScheduler } from '@/components/scheduling/EmailScheduler'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { clientsService, invoicesService } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Bot, Send, Copy, Clock, User, Timer, Paperclip } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  company?: string
}

interface Invoice {
  id: string
  number: string
  amount_cents: number
  currency: string
  due_date: string
  status: string
}

interface FollowupComposerProps {
  clientId?: string
  invoiceId?: string
  editMessageId?: string
  editScheduleId?: string
  onMessageGenerated?: (message: string) => void
}

export function FollowupComposer({ clientId, invoiceId, editMessageId, editScheduleId, onMessageGenerated }: FollowupComposerProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [messageType, setMessageType] = useState<'followup' | 'reminder' | 'update'>('followup')
  const [tone, setTone] = useState<'friendly' | 'professional' | 'firm'>('professional')
  const [customContext, setCustomContext] = useState('')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  // const [provider] = useState<'openai'>('openai')
  const [isScheduling, setIsScheduling] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [attachInvoicePDF, setAttachInvoicePDF] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingMessage, setEditingMessage] = useState<Record<string, unknown> | null>(null)
  const [isScheduleEditMode, setIsScheduleEditMode] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Record<string, unknown> | null>(null)

  const supabase = createClient()

  // Define helper functions first
  const loadClientInvoices = useCallback(async (clientId: string) => {
    try {
      console.log('📋 Loading invoices for client:', clientId);
      const user = await getCurrentUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        return;
      }

      // Use proper database service to get invoices by client
      const allInvoices = await invoicesService.list(user.id);
      const clientInvoices = allInvoices.filter(inv => inv.client_id === clientId);
      
      console.log('✅ Loaded client invoices:', clientInvoices.length);
      setInvoices(clientInvoices);
    } catch (error) {
      console.error('❌ Failed to load client invoices:', error);
      setInvoices([]);
    }
  }, [])

  // Define loadInitialData before useEffect
  const loadInitialData = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('📋 Loading clients for follow-up composer...');
      const user = await getCurrentUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        setClients([]);
        return;
      }

      // Use proper database service to get clients
      const clientsData = await clientsService.list(user.id, { 
        orderBy: { column: 'name', ascending: true } 
      });
      
      console.log('✅ Loaded clients:', clientsData.length);
      setClients(clientsData)

      // If clientId provided, select it and load its invoices
      if (clientId) {
        const client = clientsData?.find(c => c.id === clientId)
        if (client) {
          setSelectedClient(client)
          await loadClientInvoices(clientId)
        }
      }

      // If invoiceId provided, select it
      if (invoiceId) {
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('id, number, amount_cents, currency, due_date, status')
          .eq('id', invoiceId)
          .single()

        if (invoiceData) {
          setSelectedInvoice(invoiceData)
          // Auto-select reminder type if invoice is overdue
          if (invoiceData.status === 'overdue') {
            setMessageType('reminder')
            setTone('firm')
          }
        }
      }

      // If editScheduleId provided, load existing scheduled email for editing
      if (editScheduleId) {
        const { data: scheduleData } = await supabase
          .from('email_schedules')
          .select(`
            *,
            clients!inner(id, name, email, company)
          `)
          .eq('id', editScheduleId)
          .single()

        if (scheduleData) {
          setIsScheduleEditMode(true)
          setEditingSchedule(scheduleData)
          
          // Pre-populate form with existing schedule data
          setGeneratedMessage(scheduleData.email_body)
          setEmailSubject(scheduleData.email_subject || '')
          
          // Set client if available
          if (scheduleData.clients) {
            setSelectedClient(scheduleData.clients)
            await loadClientInvoices(scheduleData.clients.id)
          }
        }
      }

      // If editMessageId provided, load existing message for editing
      if (editMessageId) {
        const { data: messageData } = await supabase
          .from('messages')
          .select(`
            *,
            clients!inner(id, name, email, company),
            invoices(id, number, amount_cents, currency, due_date, status)
          `)
          .eq('id', editMessageId)
          .single()

        if (messageData) {
          setIsEditMode(true)
          setEditingMessage(messageData)
          
          // Pre-populate form with existing message data
          setMessageType(messageData.type as 'followup' | 'reminder' | 'update')
          setTone(messageData.tone as 'friendly' | 'professional' | 'firm')
          setGeneratedMessage(messageData.body)
          setEmailSubject(messageData.subject || '')
          setCustomContext(messageData.custom_context || '')
          
          // Set client and invoice if available
          if (messageData.clients) {
            setSelectedClient(messageData.clients)
            await loadClientInvoices(messageData.clients.id)
          }
          if (messageData.invoices) {
            setSelectedInvoice(messageData.invoices)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, invoiceId, editMessageId, editScheduleId, loadClientInvoices])

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const handleClientChange = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)
    setSelectedInvoice(null)
    
    if (client) {
      await loadClientInvoices(client.id)
    } else {
      setInvoices([])
    }
  }

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = invoices.find(i => i.id === invoiceId)
    setSelectedInvoice(invoice || null)
    
    // Auto-adjust message type based on invoice status
    if (invoice) {
      if (invoice.status === 'overdue') {
        setMessageType('reminder')
        setTone('firm')
      } else if (invoice.status === 'sent') {
        setMessageType('followup')
        setTone('professional')
      }
    }
  }

  const generateMessage = async () => {
    if (!selectedClient) return

    setIsGenerating(true)
    if (!isEditMode) {
      setGeneratedMessage('')
    }

    try {
      const response = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: messageType,
          tone,
          clientId: selectedClient.id,
          invoiceId: selectedInvoice?.id,
          customContext: customContext || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate message')
      }

      setGeneratedMessage(data.message)
      
      // Auto-generate subject line if not in edit mode or if subject is empty
      if (!isEditMode || !emailSubject) {
        const subjectLines = {
          followup: `Following up - ${selectedClient.name}`,
          reminder: `Payment Reminder${selectedInvoice?.number ? ` - Invoice ${selectedInvoice.number}` : ''}`,
          update: `Project Update - ${selectedClient.name}`,
        }
        setEmailSubject(subjectLines[messageType])
      }
      
      onMessageGenerated?.(data.message)

    } catch (error) {
      console.error('Failed to generate message:', error)
      // Fallback message for demo
      setGeneratedMessage(`Hi ${selectedClient.name},

I hope this message finds you well. I wanted to follow up regarding ${selectedInvoice?.number ? `invoice ${selectedInvoice.number}` : 'our recent project'}.

${selectedInvoice?.status === 'overdue' ? 'I notice the payment is now past due. ' : ''}Please let me know if you have any questions or if there\'s anything I can help clarify.

Thank you for your time and I look forward to hearing from you.

Best regards`)

      const subjectLines = {
        followup: `Following up - ${selectedClient.name}`,
        reminder: `Payment Reminder${selectedInvoice?.number ? ` - Invoice ${selectedInvoice.number}` : ''}`,
        update: `Project Update - ${selectedClient.name}`,
      }
      setEmailSubject(subjectLines[messageType])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleScheduleEmail = async (schedulePattern: {
    type: string;
    interval: number;
    timeOfDay: string;
    daysOfWeek?: number[];
    endAfter?: number;
  }) => {
    if (!selectedClient || !generatedMessage || !emailSubject) return

    setIsScheduling(true)

    try {
      const response = await fetch('/api/schedule-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          invoiceId: selectedInvoice?.id,
          messageType,
          tone,
          subject: emailSubject,
          customContext: customContext || undefined,
          attachInvoicePDF: attachInvoicePDF && !!selectedInvoice,
          schedulePattern,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule email')
      }

      // Reset form and show success
      setSelectedClient(null)
      setSelectedInvoice(null)
      setGeneratedMessage('')
      setEmailSubject('')
      setCustomContext('')
      setShowScheduler(false)
      
      alert(`✅ Email scheduled successfully!\n\nNext send: ${new Date(data.nextRunAt).toLocaleString()}\nPattern: ${data.preview}`)
      
      onMessageGenerated?.('')

    } catch (error) {
      console.error('Failed to schedule email:', error)
      alert('❌ Failed to schedule email. Please try again.')
    } finally {
      setIsScheduling(false)
    }
  }

  const copyMessage = () => {
    navigator.clipboard.writeText(generatedMessage)
  }

  const handleSaveMessage = async () => {
    if (!selectedClient || !generatedMessage || !isEditMode || !editingMessage) return

    setIsSending(true)

    try {
      const response = await fetch(`/api/messages/${editingMessage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: messageType,
          tone,
          subject: emailSubject,
          body: generatedMessage,
          customContext: customContext || undefined,
        }),
      })

      if (response.ok) {
        alert('✅ Message updated successfully!')
        // Redirect back to manage page
        window.location.href = '/followups/manage'
      } else {
        throw new Error('Failed to update message')
      }

    } catch (error) {
      console.error('Failed to update message:', error)
      alert('❌ Failed to update message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleUpdateSchedule = async () => {
    if (!selectedClient || !generatedMessage || !emailSubject || !isScheduleEditMode || !editingSchedule) return

    setIsSending(true)

    try {
      const { error } = await supabase
        .from('email_schedules')
        .update({
          email_subject: emailSubject,
          email_body: generatedMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSchedule.id)

      if (!error) {
        alert('✅ Scheduled email updated successfully!')
        // Redirect back to manage page
        window.location.href = '/followups/manage'
      } else {
        throw new Error('Failed to update scheduled email')
      }

    } catch (error) {
      console.error('Failed to update scheduled email:', error)
      alert('❌ Failed to update scheduled email. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const handleSendEmail = async () => {
    if (!selectedClient || !generatedMessage || !emailSubject) return

    setIsSending(true)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          invoiceId: selectedInvoice?.id,
          subject: emailSubject,
          body: generatedMessage,
          messageType,
          tone,
          attachInvoicePDF: attachInvoicePDF && !!selectedInvoice,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      // Show success message with details
      const attachmentInfo = data.attachmentIncluded ? 
        `\nInvoice PDF attached: ${data.invoiceNumber}` : 
        ''
      
      alert(`✅ Email sent successfully!\n\nTo: ${data.clientEmail}${attachmentInfo}`)
      
      // Reset form
      setSelectedClient(null)
      setSelectedInvoice(null)
      setGeneratedMessage('')
      setEmailSubject('')
      setCustomContext('')
      
      onMessageGenerated?.('')

    } catch (error) {
      console.error('Failed to send email:', error)
      alert('❌ Failed to send email. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading composer..." />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Edit Mode Banner */}
      {(isEditMode || isScheduleEditMode) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          <div className="flex-1">
            <p className="text-blue-900 font-medium">
              {isEditMode ? 'Editing Draft Message' : 'Editing Scheduled Email'}
            </p>
            <p className="text-blue-700 text-sm">
              {isEditMode 
                ? 'Make your changes and click "Update Message" to save, or regenerate for a new version.'
                : 'Make your changes and click "Update Schedule" to save, or regenerate for a new version.'
              }
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/followups/manage'}
            className="text-blue-600 border-blue-300"
          >
            ← Back to Manage
          </Button>
        </div>
      )}

      {/* Configuration Panel */}
      <Card className="p-6 bg-white/50 backdrop-blur border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Client</label>
            <Select value={selectedClient?.id || ''} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{client.name}</span>
                      {client.company && <Badge variant="secondary">{client.company}</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Invoice (Optional)</label>
            <Select 
              value={selectedInvoice?.id || ''} 
              onValueChange={handleInvoiceChange}
              disabled={!selectedClient}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map(invoice => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>#{invoice.number}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {invoice.currency} {(invoice.amount_cents / 100).toFixed(2)}
                        </span>
                        <Badge 
                          variant={invoice.status === 'overdue' ? 'destructive' : 
                                 invoice.status === 'paid' ? 'default' : 'secondary'}
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI Provider */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">AI Provider</label>
            <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-md border border-blue-200">
              <Bot className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-700 font-medium">OpenAI GPT-4</span>
              <Badge variant="default" className="ml-auto bg-blue-600 hover:bg-blue-700">
                ✨ Ready
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              AI-powered message generation with tone selection and context awareness
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Message Type and Tone */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Message Type</label>
            <Select value={messageType} onValueChange={(value: 'followup' | 'reminder' | 'update') => setMessageType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="followup">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Follow-up</span>
                  </div>
                </SelectItem>
                <SelectItem value="reminder">Payment Reminder</SelectItem>
                <SelectItem value="update">Project Update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tone</label>
            <Select value={tone} onValueChange={(value: 'friendly' | 'professional' | 'firm') => setTone(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">😊 Friendly & Warm</SelectItem>
                <SelectItem value="professional">👔 Professional</SelectItem>
                <SelectItem value="firm">📋 Firm & Direct</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Context */}
        <div className="mt-6 space-y-2">
          <label className="text-sm font-medium text-gray-700">Additional Context (Optional)</label>
          <Textarea
            placeholder="Add any specific details you want to include..."
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Quick Presets */}
        {selectedClient && (
          <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Quick Presets</span>
              <Badge variant="outline" className="text-xs">One-click generation</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMessageType('followup');
                  setTone('friendly');
                  generateMessage();
                }}
                disabled={!selectedClient || isGenerating}
                className="justify-start"
              >
                😊 Friendly Check-in
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMessageType('reminder');
                  setTone('professional');
                  generateMessage();
                }}
                disabled={!selectedClient || isGenerating}
                className="justify-start"
              >
                💼 Payment Reminder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMessageType('reminder');
                  setTone('firm');
                  generateMessage();
                }}
                disabled={!selectedClient || isGenerating}
                className="justify-start"
              >
                📋 Firm Follow-up
              </Button>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-6 flex justify-center">
          <Button 
            onClick={generateMessage}
            disabled={!selectedClient || isGenerating}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 shadow-lg"
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating with AI...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <span>
                  {isEditMode ? '🔄 Regenerate Message' : '✨ Generate with AI'}
                </span>
              </div>
            )}
          </Button>
        </div>
      </Card>

      {/* Generated Message */}
      {generatedMessage && (
        <>
          <Card className="p-6 bg-white border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditMode ? 'Edit Message' : 'Generated Message'}
              </h3>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={copyMessage}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowScheduler(!showScheduler)}
                  className={showScheduler ? "bg-blue-50 border-blue-300" : ""}
                >
                  <Timer className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
{isEditMode ? (
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSaveMessage}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Update Message
                      </>
                    )}
                  </Button>
                ) : isScheduleEditMode ? (
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleUpdateSchedule}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Update Schedule
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleSendEmail}
                    disabled={isSending || !selectedClient?.email}
                  >
                    {isSending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Now {selectedInvoice && attachInvoicePDF && <Paperclip className="h-3 w-3 ml-1" />}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Subject Line */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">Subject Line</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Email subject..."
              />
            </div>

            {/* PDF Attachment Option */}
            {selectedInvoice && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <Label htmlFor="attach-pdf" className="text-sm font-medium text-blue-900">
                      Attach Invoice PDF
                    </Label>
                  </div>
                  <Switch
                    id="attach-pdf"
                    checked={attachInvoicePDF}
                    onCheckedChange={setAttachInvoicePDF}
                  />
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Invoice #{selectedInvoice.number} will be attached as a PDF when this email is sent.
                </p>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700 border">
              {generatedMessage}
            </div>
            
            {selectedClient && (
              <div className="mt-4 text-xs text-gray-500">
                Generated for: {selectedClient.name} ({selectedClient.email})
                {selectedInvoice && ` • Invoice: ${selectedInvoice.number}`}
              </div>
            )}
          </Card>

          {/* Email Scheduler */}
          {showScheduler && (
            <EmailScheduler
              onSchedule={handleScheduleEmail}
              disabled={isScheduling}
              className="mt-6"
            />
          )}
        </>
      )}
    </div>
  )
}