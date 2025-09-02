'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { downloadInvoicePDF, previewInvoicePDF, type InvoiceData } from '@/lib/pdf'
import { Download, Eye, Share, FileText } from 'lucide-react'

interface LineItem {
  description: string
  qty: number
  unit_price: number
  total: number
}

interface Client {
  name: string
  email?: string
  company?: string
}

interface InvoicePreviewProps {
  invoiceNumber: string
  currency: string
  dueDate: string
  lineItems: LineItem[]
  selectedClient: Client | null
  taxPercentage?: number
  notes?: string
  businessName?: string
  businessEmail?: string
  showActions?: boolean
  className?: string
}

export function InvoicePreview({
  invoiceNumber,
  currency,
  dueDate,
  lineItems,
  selectedClient,
  taxPercentage = 0,
  notes,
  businessName = 'ClientHandle',
  businessEmail,
  showActions = true,
  className = ''
}: InvoicePreviewProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateTax = () => {
    return (calculateSubtotal() * taxPercentage) / 100
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleDownloadPDF = () => {
    if (!selectedClient) return

    const pdfData: InvoiceData = {
      number: invoiceNumber,
      issueDate: new Date().toISOString(),
      dueDate: dueDate,
      currency: currency,
      amountCents: Math.round(calculateTotal() * 100),
      client: {
        name: selectedClient.name,
        email: selectedClient.email,
        company: selectedClient.company,
      },
      lineItems: lineItems.map(item => ({
        description: item.description,
        qty: item.qty,
        unitPriceCents: Math.round(item.unit_price * 100),
        totalCents: Math.round(item.total * 100),
      })),
      taxPercentage: taxPercentage,
      notes: notes,
      business: {
        name: businessName,
        email: businessEmail,
      },
    }

    downloadInvoicePDF(pdfData)
  }

  const handlePreviewPDF = () => {
    if (!selectedClient) return

    const pdfData: InvoiceData = {
      number: invoiceNumber,
      issueDate: new Date().toISOString(),
      dueDate: dueDate,
      currency: currency,
      amountCents: Math.round(calculateTotal() * 100),
      client: {
        name: selectedClient.name,
        email: selectedClient.email,
        company: selectedClient.company,
      },
      lineItems: lineItems.map(item => ({
        description: item.description,
        qty: item.qty,
        unitPriceCents: Math.round(item.unit_price * 100),
        totalCents: Math.round(item.total * 100),
      })),
      taxPercentage: taxPercentage,
      notes: notes,
      business: {
        name: businessName,
        email: businessEmail,
      },
    }

    previewInvoicePDF(pdfData)
  }

  return (
    <Card className={`overflow-hidden border-0 shadow-apple-md ${className}`}>
      {/* Header */}
      {showActions && (
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Invoice Preview</h3>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewPDF}
                disabled={!selectedClient || lineItems.some(item => !item.description)}
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Preview PDF</span>
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={!selectedClient || lineItems.some(item => !item.description)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Content */}
      <div className="bg-white p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
            <p className="text-lg text-gray-600">{invoiceNumber}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-900">{businessName}</h2>
            <p className="text-sm text-gray-500">Professional Freelancer Tool</p>
            {businessEmail && (
              <p className="text-sm text-gray-500 mt-1">{businessEmail}</p>
            )}
          </div>
        </div>

        <Separator className="border-gray-200" />

        {/* Client & Date Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Bill To:</h3>
            {selectedClient ? (
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{selectedClient.name}</p>
                {selectedClient.company && (
                  <p className="text-gray-700">{selectedClient.company}</p>
                )}
                {selectedClient.email && (
                  <p className="text-gray-500">{selectedClient.email}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 italic">Select a client to preview</p>
            )}
          </div>
          <div className="text-right md:text-right">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Issue Date:</span>
                <span className="font-medium">{formatDate(new Date().toISOString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-semibold text-blue-600">
                  {dueDate ? formatDate(dueDate) : "Not set"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 w-20">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 w-24">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 w-28">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.description || (
                        <span className="text-gray-400 italic">Enter description...</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {item.qty}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatAmount(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatAmount(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Section */}
        <div className="flex justify-end">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium">{formatAmount(calculateSubtotal())}</span>
            </div>
            {taxPercentage > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax ({taxPercentage.toFixed(taxPercentage % 1 === 0 ? 0 : 2)}%):</span>
                <span className="font-medium">{formatAmount(calculateTax())}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total:</span>
              <span className="text-blue-600">{formatAmount(calculateTotal())}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <>
            <Separator className="border-gray-200" />
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes:</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {notes}
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Generated with ClientHandle - Professional Freelancer Tool
          </p>
        </div>
      </div>
    </Card>
  )
}