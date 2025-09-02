"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientList } from "@/components/clients/ClientList";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { getCurrentUser } from "@/lib/auth";
import { clientsService, Client } from "@/lib/db";
import { AddUserIcon, UsersIcon, SearchIcon } from "@/components/icons";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const searchParams = useSearchParams();

  // Check if we should show add dialog from URL
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setShowAddDialog(true);
    }
  }, [searchParams]);

  const loadClients = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const clientList = await clientsService.list(user.id);
      setClients(clientList);
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleClientAdded = () => {
    loadClients();
    setShowAddDialog(false);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading your clients..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 mb-2">Clients</h1>
          <p className="text-body text-muted-foreground">
            Manage your client relationships and contact information.
          </p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="animate-apple-press shadow-apple-sm"
        >
          <AddUserIcon size="sm" className="mr-2" />
          Add Client
        </Button>
      </div>

      {clients.length > 0 ? (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <SearchIcon size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 bg-input border-0 focus:ring-2 focus:ring-primary/20 pl-10"
            />
          </div>

          {/* Client List */}
          {filteredClients.length > 0 ? (
            <ClientList 
              clients={filteredClients} 
              onClientUpdated={loadClients}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-body text-muted-foreground">
                No clients found matching &quot;{searchTerm}&quot;
              </p>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<UsersIcon size="xl" variant="muted" />}
          title="No clients yet"
          description="Start building your client database by adding your first client. Keep track of contact information, project history, and communication."
          action={{
            label: "Add Your First Client",
            onClick: () => setShowAddDialog(true),
          }}
        />
      )}

      <AddClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onClientAdded={handleClientAdded}
      />
    </div>
  );
}