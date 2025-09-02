"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import { clientsService, Client } from "@/lib/db";

interface EditClientDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated: (client: Client) => void;
}

export function EditClientDialog({ client, open, onOpenChange, onClientUpdated }: EditClientDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Update form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        company: client.company || "",
        notes: client.notes || "",
      });
    }
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await getCurrentUser();
      if (!user) {
        setError("Authentication required");
        return;
      }

      if (!formData.name.trim()) {
        setError("Client name is required");
        return;
      }

      await clientsService.update(client.id!, user.id, {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      // Create updated client object for UI
      const updatedClient: Client = {
        ...client,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        updated_at: new Date().toISOString(),
      };

      onClientUpdated(updatedClient);
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message || "Failed to update client");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setError("");
        // Reset form to original client data
        if (client) {
          setFormData({
            name: client.name || "",
            email: client.email || "",
            phone: client.phone || "",
            company: client.company || "",
            notes: client.notes || "",
          });
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md border-0 shadow-apple-lg">
        <DialogHeader>
          <DialogTitle className="text-h2">Edit Client</DialogTitle>
          <DialogDescription className="text-body text-muted-foreground">
            Update your client&apos;s information and contact details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-body-small font-medium">
              Full Name *
            </Label>
            <Input
              id="edit-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter client's full name"
              required
              className="h-10 bg-input border-0 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-body-small font-medium">
              Email Address
            </Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="client@example.com"
              className="h-10 bg-input border-0 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone" className="text-body-small font-medium">
              Phone Number
            </Label>
            <Input
              id="edit-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              className="h-10 bg-input border-0 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-company" className="text-body-small font-medium">
              Company
            </Label>
            <Input
              id="edit-company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Company name (optional)"
              className="h-10 bg-input border-0 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes" className="text-body-small font-medium">
              Notes
            </Label>
            <textarea
              id="edit-notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes about this client..."
              rows={3}
              className="w-full px-3 py-2 bg-input border-0 rounded-lg focus:ring-2 focus:ring-primary/20 resize-none text-body-small"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="flex-1 animate-apple-press"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 animate-apple-press shadow-apple-sm"
            >
              {loading ? "Updating..." : "Update Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}