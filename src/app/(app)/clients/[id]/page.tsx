"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientTimeline } from "@/components/clients/ClientTimeline";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { LoadingState } from "@/components/common/LoadingState";
import { getCurrentUser } from "@/lib/auth";
import { clientsService, invoicesService, messagesService, Client, Invoice, Message } from "@/lib/db";

export default function ClientDetailPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  useEffect(() => {
    const loadClientData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/sign-in");
          return;
        }

        // Load client data and related information in parallel
        const [clientData, clientInvoices, clientMessages] = await Promise.all([
          clientsService.get(clientId, user.id),
          invoicesService.list(user.id, {
            filters: [{ column: 'client_id', operator: 'eq', value: clientId }]
          }),
          messagesService.list(user.id, {
            filters: [{ column: 'client_id', operator: 'eq', value: clientId }]
          }),
        ]);

        if (!clientData) {
          router.push("/clients");
          return;
        }

        setClient(clientData);
        setInvoices(clientInvoices);
        setMessages(clientMessages);
      } catch (error) {
        console.error("Failed to load client data:", error);
        router.push("/clients");
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      loadClientData();
    }
  }, [clientId, router]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading client details..." />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <h2 className="text-h2 mb-2">Client not found</h2>
          <p className="text-body text-muted-foreground mb-4">
            The client you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button onClick={() => router.push("/clients")}>
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string | { toDate?: () => Date } | null) => {
    if (!date) return "Never";
    const d = (typeof date === 'object' && date !== null && 'toDate' in date && typeof date.toDate === 'function') 
      ? date.toDate() 
      : new Date(date as string | Date);
    return d.toLocaleDateString();
  };

  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.amount_cents, 0) / 100;
  const paidAmount = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount_cents, 0) / 100;
  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;

  const handleClientUpdated = (updatedClient: Client) => {
    setClient(updatedClient);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => router.push("/clients")}
            className="mb-4 p-0 h-auto text-muted-foreground hover:text-foreground"
          >
            ← Back to Clients
          </Button>
          <h1 className="text-h1 mb-2">{client.name}</h1>
          {client.company && (
            <p className="text-body-large text-muted-foreground">{client.company}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setEditDialogOpen(true)}
            className="animate-apple-press"
          >
            Edit Client
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push(`/invoices/create?clientId=${client.id}`)}
            className="animate-apple-press"
          >
            Create Invoice
          </Button>
          <Button 
            onClick={() => router.push(`/followups?clientId=${client.id}`)}
            className="animate-apple-press shadow-apple-sm"
          >
            Send Follow-up
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Information */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-0 shadow-apple-md">
            <CardHeader>
              <CardTitle className="text-h3">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.email && (
                <div>
                  <p className="text-body-small font-medium text-muted-foreground">Email</p>
                  <p className="text-body">{client.email}</p>
                </div>
              )}
              {client.phone && (
                <div>
                  <p className="text-body-small font-medium text-muted-foreground">Phone</p>
                  <p className="text-body">{client.phone}</p>
                </div>
              )}
              <div>
                <p className="text-body-small font-medium text-muted-foreground">Added</p>
                <p className="text-body">{formatDate(client.createdAt)}</p>
              </div>
              <div>
                <p className="text-body-small font-medium text-muted-foreground">Last Contact</p>
                <p className="text-body">{formatDate(client.lastContactAt)}</p>
              </div>
              {client.notes && (
                <div>
                  <p className="text-body-small font-medium text-muted-foreground">Notes</p>
                  <p className="text-body">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="border-0 shadow-apple-md">
            <CardHeader>
              <CardTitle className="text-h3">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-body-small font-medium text-muted-foreground">Total Invoiced</p>
                <p className="text-h2 font-semibold">${totalInvoiceAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-body-small font-medium text-muted-foreground">Amount Paid</p>
                <p className="text-body-large font-medium text-green-600">${paidAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-body-small font-medium text-muted-foreground">Outstanding</p>
                <p className="text-body-large font-medium text-orange-600">
                  ${(totalInvoiceAmount - paidAmount).toLocaleString()}
                </p>
              </div>
              {overdueCount > 0 && (
                <div>
                  <Badge variant="destructive">
                    {overdueCount} overdue invoice{overdueCount > 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-apple-md">
            <CardHeader>
              <CardTitle className="text-h3">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientTimeline 
                invoices={invoices} 
                messages={messages}
                clientId={clientId}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      {client && (
        <EditClientDialog
          client={client}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onClientUpdated={handleClientUpdated}
        />
      )}
    </div>
  );
}