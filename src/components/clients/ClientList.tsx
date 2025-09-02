"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { getCurrentUser } from "@/lib/auth";
import { clientsService, Client } from "@/lib/db";
import { 
  EmailIcon, 
  PhoneIcon, 
  CompanyIcon, 
  MoreIcon
} from "@/components/icons";

interface ClientListProps {
  clients: Client[];
  onClientUpdated: () => void;
}

export function ClientList({ clients, onClientUpdated }: ClientListProps) {
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const handleDelete = async () => {
    if (!deleteClient) return;
    
    setDeleting(true);
    try {
      const user = await getCurrentUser();
      if (user && deleteClient.id) {
        await clientsService.delete(deleteClient.id);
        onClientUpdated();
      }
    } catch (error) {
      console.error("Failed to delete client:", error);
    } finally {
      setDeleting(false);
      setDeleteClient(null);
    }
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setEditClient(null);
    onClientUpdated();
  };

  const formatLastContact = (lastContactAt?: string | Date | null) => {
    if (!lastContactAt) return "Never";
    
    const date = (typeof lastContactAt === 'object' && lastContactAt !== null && 'toDate' in lastContactAt && typeof (lastContactAt as { toDate?: () => Date }).toDate === 'function') 
      ? (lastContactAt as { toDate: () => Date }).toDate() 
      : new Date(lastContactAt as string | Date);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <Card 
            key={client.id} 
            className="border-0 shadow-apple-md animate-apple-hover bg-card/60 backdrop-blur-sm"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-h3 font-medium text-foreground truncate">
                    {client.name}
                  </h3>
                  {client.company && (
                    <p className="text-body-small text-muted-foreground truncate">
                      {client.company}
                    </p>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreIcon size="sm" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-0 shadow-apple-lg">
                    <DropdownMenuItem asChild>
                      <Link href={`/clients/${client.id}`}>
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/invoices/create?clientId=${client.id}`}>
                        Create Invoice
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/followups?clientId=${client.id}`}>
                        Send Follow-up
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteClient(client)}
                    >
                      Delete Client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-4">
                {client.email && (
                  <div className="flex items-center gap-2 text-body-small text-muted-foreground">
                    <EmailIcon size="sm" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-body-small text-muted-foreground">
                    <PhoneIcon size="sm" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.company && (
                  <div className="flex items-center gap-2 text-body-small text-muted-foreground">
                    <CompanyIcon size="sm" />
                    <span className="truncate">{client.company}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  Last contact: {formatLastContact(client.last_contact_at)}
                </Badge>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => setEditClient(client)}
                  >
                    Edit
                  </Button>
                  <Link href={`/clients/${client.id}`}>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                      View →
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteClient}
        onOpenChange={() => setDeleteClient(null)}
        title="Delete Client"
        description={`Are you sure you want to delete ${deleteClient?.name}? This action cannot be undone and will also delete all associated invoices and messages.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
        loading={deleting}
      />

      {editClient && (
        <EditClientDialog
          client={editClient}
          open={!!editClient}
          onOpenChange={() => setEditClient(null)}
          onClientUpdated={handleClientUpdated}
        />
      )}
    </>
  );
}