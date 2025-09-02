"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/common/LoadingState";
import { InvoiceForm, type InvoiceFormData } from "@/components/invoices/InvoiceForm";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { getCurrentUser } from "@/lib/auth";
import { clientsService } from "@/lib/db";

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

export default function CreateInvoicePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState({
    invoiceNumber: '',
    currency: 'USD',
    dueDate: '',
    lineItems: [{ description: '', qty: 1, unit_price: 0, total: 0 }],
    selectedClient: null as Client | null,
    taxPercentage: 0,
    notes: '',
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/sign-in");
          return;
        }

        const clientsList = await clientsService.list(user.id);
        setClients(clientsList);

        // Pre-select client from URL
        const clientId = searchParams.get("clientId");
        const selectedClient = clientId ? clientsList.find(c => c.id === clientId) : null;
        
        if (selectedClient) {
          setPreviewData(prev => ({
            ...prev,
            selectedClient
          }));
        }

      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, searchParams]);

  const handleSave = async (data: InvoiceFormData, status: 'draft' | 'sent') => {
    setSaving(true);
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice');
      }

      const result = await response.json();
      
      // Update preview data for live preview
      const selectedClient = clients.find(c => c.id === data.client_id);
      setPreviewData({
        invoiceNumber: data.number,
        currency: data.currency,
        dueDate: data.due_date,
        lineItems: data.line_items.map(item => ({
          description: item.description,
          qty: item.qty,
          unit_price: item.unit_price_cents / 100,
          total: item.total_cents / 100,
        })),
        selectedClient: selectedClient || null,
        notes: data.notes || '',
      });

      // Show success message
      alert(`✅ Invoice ${data.number} ${status === 'draft' ? 'saved as draft' : 'created and sent'} successfully!`);
      
      // Redirect to invoices list
      router.push("/invoices");
    } catch (error) {
      console.error("Failed to save invoice:", error);
      alert(`❌ ${error instanceof Error ? error.message : 'Failed to save invoice. Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleDataChange = (data: {
    invoiceNumber: string
    currency: string
    dueDate: string
    lineItems: Array<{ description: string; qty: number; unit_price: number; total: number }>
    selectedClient: Client | null
    taxPercentage: number
    notes: string
  }) => {
    setPreviewData(data);
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading invoice creator..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Invoice</h1>
        <p className="text-gray-600">
          Generate a professional invoice with Apple-style design and instant PDF download.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Invoice Form */}
        <InvoiceForm
          clients={clients}
          initialClientId={searchParams.get("clientId") || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
          onDataChange={handleDataChange}
        />

        {/* Live Preview */}
        <InvoicePreview
          invoiceNumber={previewData.invoiceNumber || 'INV-Preview'}
          currency={previewData.currency}
          dueDate={previewData.dueDate}
          lineItems={previewData.lineItems}
          selectedClient={previewData.selectedClient}
          taxPercentage={previewData.taxPercentage}
          notes={previewData.notes}
          businessName="ClientHandle"
          businessEmail="noreply@clienthandle.com"
          showActions={true}
          className="sticky top-20 z-10"
        />
      </div>
    </div>
  );
}