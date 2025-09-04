'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AddIcon, 
  DeleteIcon,
  UsersIcon,
  CalendarIcon,
  SaveIcon,
  BillingIcon
} from '@/components/icons'

interface Client {
  id: string
  name: string
  email?: string
  company?: string
}

interface LineItem {
  description: string
  qty: number
  unit_price: number
  total: number
}

interface InvoiceFormProps {
  clients: Client[]
  initialClientId?: string
  onSave: (data: InvoiceFormData, status: 'draft' | 'sent') => Promise<void>
  onCancel: () => void
  saving: boolean
  onDataChange?: (data: {
    invoiceNumber: string
    currency: string
    dueDate: string
    lineItems: LineItem[]
    selectedClient: Client | null
    taxPercentage: number
    notes: string
  }) => void
}

export interface InvoiceFormData {
  client_id: string
  number: string
  currency: string
  amount_cents: number
  due_date: string
  line_items: Array<{
    description: string
    qty: number
    unit_price_cents: number
    total_cents: number
  }>
  status: 'draft' | 'sent'
}

export function InvoiceForm({ 
  clients, 
  initialClientId, 
  onSave, 
  onCancel, 
  saving,
  onDataChange
}: InvoiceFormProps) {
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || '')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [dueDate, setDueDate] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', qty: 0, unit_price: 0, total: 0 }
  ])

  // Auto-generate invoice number
  useEffect(() => {
    const generateInvoiceNumber = () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      return `INV-${year}${month}-${random}`
    }

    if (!invoiceNumber) {
      setInvoiceNumber(generateInvoiceNumber())
    }
  }, [invoiceNumber])

  // Set default due date (30 days from now)
  useEffect(() => {
    if (!dueDate) {
      const defaultDueDate = new Date()
      defaultDueDate.setDate(defaultDueDate.getDate() + 30)
      setDueDate(defaultDueDate.toISOString().split('T')[0])
    }
  }, [dueDate])

  // Notify parent whenever any relevant data changes
  useEffect(() => {
    const selectedClient = clients.find(c => c.id === selectedClientId)
    if (onDataChange) {
      onDataChange({
        invoiceNumber,
        currency,
        dueDate,
        lineItems,
        selectedClient: selectedClient || null,
        taxPercentage: 0,
        notes: '',
      })
    }
  }, [lineItems, selectedClientId, invoiceNumber, currency, dueDate, clients])


  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newLineItems = [...lineItems]
    newLineItems[index] = { ...newLineItems[index], [field]: value }
    
    // Auto-calculate total (always recalculate to ensure it's correct)
    const qty = newLineItems[index].qty || 0
    const unitPrice = newLineItems[index].unit_price || 0
    newLineItems[index].total = qty * unitPrice
    
    
    setLineItems(newLineItems)
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', qty: 0, unit_price: 0, total: 0 }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0)
  }

  const handleSubmit = async (status: 'draft' | 'sent') => {
    if (!selectedClientId || !invoiceNumber || lineItems.some(item => !item.description.trim())) {
      alert('Please fill in all required fields')
      return
    }

    const formData: InvoiceFormData = {
      client_id: selectedClientId,
      number: invoiceNumber,
      currency: currency,
      amount_cents: Math.round(calculateTotal() * 100),
      due_date: dueDate,
      line_items: lineItems.map(item => ({
        description: item.description,
        qty: item.qty,
        unit_price_cents: Math.round(item.unit_price * 100),
        total_cents: Math.round(item.total * 100),
      })),
      status: status,
    }

    await onSave(formData, status)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  return (
    <Card className="p-6 border-0 shadow-apple-md">
      <div className="flex items-center gap-2 mb-6">
        <BillingIcon size="md" variant="accent" />
        <h2 className="text-xl font-semibold">Invoice Details</h2>
      </div>

      <div className="space-y-6">
        {/* Client Selection */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Client *</Label>
          <Select value={selectedClientId} onValueChange={(value) => {
            setSelectedClientId(value);
          }}>
            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 mt-1">
              <SelectValue placeholder="Select a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex items-center gap-2">
                    <UsersIcon size="sm" />
                    <span>{client.name}</span>
                    {client.company && (
                      <span className="text-gray-500">({client.company})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Invoice Number & Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Invoice Number *</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => {
                setInvoiceNumber(e.target.value);
              }}
              placeholder="INV-001"
              className="h-11 bg-gray-50 border-gray-200 mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Currency</Label>
            <Select value={currency} onValueChange={(value) => {
              setCurrency(value);
            }}>
              <SelectTrigger className="h-11 bg-gray-50 border-gray-200 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">🇺🇸 USD - US Dollar</SelectItem>
                <SelectItem value="EUR">🇪🇺 EUR - Euro</SelectItem>
                <SelectItem value="GBP">🇬🇧 GBP - British Pound</SelectItem>
                <SelectItem value="INR">🇮🇳 INR - Indian Rupee</SelectItem>
                <SelectItem value="CAD">🇨🇦 CAD - Canadian Dollar</SelectItem>
                <SelectItem value="AUD">🇦🇺 AUD - Australian Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Due Date */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Due Date *</Label>
          <div className="relative mt-1">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
              }}
              className="h-11 bg-gray-50 border-gray-200"
            />
            <CalendarIcon size="sm" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium text-gray-700">Line Items *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="flex items-center gap-1"
            >
              <AddIcon size="sm" />
              Add Item
            </Button>
          </div>
          
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                <div className="col-span-5">
                  <Label className="text-xs text-gray-600">Description</Label>
                  <Input
                    placeholder="Enter description..."
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    className="h-9 text-sm bg-white border-gray-200"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-gray-600">Qty</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={item.qty === 0 ? '' : item.qty}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateLineItem(index, 'qty', 0);
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          updateLineItem(index, 'qty', numValue);
                        }
                      }
                    }}
                    onFocus={(e) => {
                      // When user focuses and value is 0, select all so they can type over it
                      if (item.qty === 0) {
                        e.target.select();
                      }
                    }}
                    onBlur={(e) => {
                      // Clean up any leading zeros when user leaves the field
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        updateLineItem(index, 'qty', value);
                      }
                    }}
                    className="h-9 text-sm bg-white border-gray-200"
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-gray-600">Price</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={item.unit_price === 0 ? '' : item.unit_price}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateLineItem(index, 'unit_price', 0);
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          updateLineItem(index, 'unit_price', numValue);
                        }
                      }
                    }}
                    onFocus={(e) => {
                      // When user focuses and value is 0, select all so they can type over it
                      if (item.unit_price === 0) {
                        e.target.select();
                      }
                    }}
                    onBlur={(e) => {
                      // Clean up any leading zeros when user leaves the field
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        updateLineItem(index, 'unit_price', value);
                      }
                    }}
                    className="h-9 text-sm bg-white border-gray-200"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="col-span-2 text-right">
                  <Label className="text-xs text-gray-600">Total</Label>
                  <div className="h-9 flex items-center justify-end text-sm font-semibold text-gray-900">
                    {formatAmount(item.total)}
                  </div>
                </div>
                <div className="col-span-1 flex justify-center">
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <DeleteIcon size="sm" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total Display */}
          <div className="mt-4">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  <div className="flex justify-between text-sm text-blue-700">
                    <span className="font-medium">Total:</span>
                    <span className="text-lg font-bold text-blue-800">
                      {formatAmount(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleSubmit('draft')}
            disabled={saving}
            variant="outline"
            className="flex-1"
          >
            <SaveIcon size="sm" className="mr-2" />
            Save Draft
          </Button>
          <Button 
            onClick={() => handleSubmit('sent')}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <BillingIcon size="sm" className="mr-2" />
            {saving ? 'Creating...' : 'Create & Send'}
          </Button>
        </div>
      </div>
    </Card>
  )
}