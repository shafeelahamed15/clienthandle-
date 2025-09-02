"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { getCurrentUser } from "@/lib/auth";
import { invoicesService, clientsService } from "@/lib/db";
import { 
  BillingIcon, 
  AddIcon, 
  SearchIcon, 
  FilterIcon,
  UsersIcon,
  RevenueIcon,
  WarningIcon,
  CheckCircle,
  ViewIcon,
  EditIcon,
  SendIcon,
  DownloadIcon 
} from "@/components/icons";

interface Invoice {
  id: string;
  owner_uid: string;
  client_id: string;
  number: string;
  currency: string;
  amount_cents: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  due_date: string;
  line_items: Array<{
    description: string;
    qty: number;
    unit_price_cents: number;
    total_cents: number;
  }>;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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

        // Load invoices and clients
        const [invoicesList, clientsList] = await Promise.all([
          invoicesService.list(user.id),
          clientsService.list(user.id)
        ]);

        setInvoices(invoicesList);
        setClients(clientsList);

        // Check for status filter from URL
        const filter = searchParams.get("filter") as StatusFilter;
        if (filter && ['draft', 'sent', 'paid', 'overdue', 'void'].includes(filter)) {
          setStatusFilter(filter);
        }

      } catch (error) {
        console.error("Failed to load invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, searchParams]);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const getClientCompany = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company;
  };

  const formatAmount = (amountCents: number, currency: string) => {
    const amount = amountCents / 100;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    });
    return formatter.format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'default',
      sent: 'secondary',
      paid: 'default',
      overdue: 'destructive',
      void: 'outline'
    } as const;

    const colors = {
      draft: 'text-muted-foreground',
      sent: 'text-blue-600',
      paid: 'text-green-600',
      overdue: 'text-red-600',
      void: 'text-gray-500'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size="sm" className="text-green-600" />;
      case 'overdue':
        return <WarningIcon size="sm" className="text-red-600" />;
      case 'sent':
        return <SendIcon size="sm" className="text-blue-600" />;
      default:
        return <BillingIcon size="sm" className="text-muted-foreground" />;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(invoice.client_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientCompany(invoice.client_id)?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, invoice) => sum + invoice.amount_cents, 0)
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Get filename from response headers or create one
      const invoice = invoices.find(i => i.id === invoiceId);
      const clientName = getClientName(invoice?.client_id || '');
      const filename = `Invoice-${invoice?.number}-${clientName.replace(/\s+/g, '-')}.pdf`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      // You could add a toast notification here
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading your invoices..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 mb-2">Invoices</h1>
          <p className="text-body text-muted-foreground">
            Manage your invoices, track payments, and send professional billing documents.
          </p>
        </div>
        <Link href="/invoices/create">
          <Button className="animate-apple-press shadow-apple-sm">
            <AddIcon size="sm" className="mr-2" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-0 shadow-apple-sm">
            <div className="flex items-center gap-2 mb-2">
              <BillingIcon size="sm" variant="accent" />
              <span className="text-body-small font-medium">Total Invoices</span>
            </div>
            <p className="text-h2 font-semibold">{stats.total}</p>
          </Card>
          
          <Card className="p-4 border-0 shadow-apple-sm">
            <div className="flex items-center gap-2 mb-2">
              <WarningIcon size="sm" variant="error" />
              <span className="text-body-small font-medium">Overdue</span>
            </div>
            <p className="text-h2 font-semibold text-red-600">{stats.overdue}</p>
          </Card>
          
          <Card className="p-4 border-0 shadow-apple-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size="sm" variant="success" />
              <span className="text-body-small font-medium">Paid</span>
            </div>
            <p className="text-h2 font-semibold text-green-600">{stats.paid}</p>
          </Card>
          
          <Card className="p-4 border-0 shadow-apple-sm">
            <div className="flex items-center gap-2 mb-2">
              <RevenueIcon size="sm" variant="success" />
              <span className="text-body-small font-medium">Total Value</span>
            </div>
            <p className="text-h2 font-semibold">{formatAmount(stats.totalAmount, 'USD')}</p>
          </Card>
        </div>
      )}

      {invoices.length > 0 ? (
        <>
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <SearchIcon size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <FilterIcon size="sm" className="mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoice List */}
          {filteredInvoices.length > 0 ? (
            <div className="space-y-3">
              {filteredInvoices.map((invoice) => (
                <Card key={invoice.id} className="p-4 border-0 shadow-apple-sm animate-apple-hover">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invoice.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invoice.number}</span>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <UsersIcon size="sm" />
                            <span>{getClientName(invoice.client_id)}</span>
                            {getClientCompany(invoice.client_id) && (
                              <span>• {getClientCompany(invoice.client_id)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatAmount(invoice.amount_cents, invoice.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Due {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="animate-apple-press"
                        onClick={() => handleDownloadPDF(invoice.id)}
                      >
                        <DownloadIcon size="sm" className="mr-1" />
                        PDF
                      </Button>
                      
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="outline" size="sm" className="animate-apple-press">
                          <ViewIcon size="sm" className="mr-1" />
                          View
                        </Button>
                      </Link>
                      
                      {invoice.status === 'draft' && (
                        <Link href={`/invoices/${invoice.id}/edit`}>
                          <Button variant="outline" size="sm" className="animate-apple-press">
                            <EditIcon size="sm" className="mr-1" />
                            Edit
                          </Button>
                        </Link>
                      )}
                      
                      
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <Link href={`/followups?clientId=${invoice.client_id}&invoiceId=${invoice.id}`}>
                          <Button variant="outline" size="sm" className="animate-apple-press">
                            <SendIcon size="sm" className="mr-1" />
                            Follow-up
                          </Button>
                        </Link>
                      )}
                      
                      {invoice.status === 'draft' && (
                        <Button variant="default" size="sm" className="animate-apple-press">
                          <SendIcon size="sm" className="mr-1" />
                          Send
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No invoices found matching your filters.
              </p>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<BillingIcon size="xl" variant="muted" />}
          title="No invoices yet"
          description="Create your first invoice to start billing clients professionally. Track payments, send reminders, and manage your cash flow."
          action={{
            label: "Create Your First Invoice",
            onClick: () => router.push("/invoices/create"),
          }}
        />
      )}
    </div>
  );
}