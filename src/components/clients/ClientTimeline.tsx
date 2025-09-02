"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import type { Invoice, Message } from "@/lib/db";

interface TimelineItem {
  id: string;
  type: 'invoice' | 'message';
  date: Date;
  title: string;
  description?: string;
  status?: string;
  amount?: number;
  data: Invoice | Message;
}

interface ClientTimelineProps {
  invoices: Invoice[];
  messages: Message[];
  clientId: string;
}

export function ClientTimeline({ invoices, messages, clientId }: ClientTimelineProps) {
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add invoices to timeline
    invoices.forEach(invoice => {
      items.push({
        id: invoice.id!,
        type: 'invoice',
        date: invoice.created_at ? new Date(invoice.created_at) : new Date(),
        title: `Invoice #${invoice.number}`,
        description: `${invoice.line_items?.length || 0} item${invoice.line_items?.length !== 1 ? 's' : ''}`,
        status: invoice.status,
        amount: invoice.amount_cents / 100,
        data: invoice,
      });
    });

    // Add messages to timeline
    messages.forEach(message => {
      items.push({
        id: message.id!,
        type: 'message',
        date: message.created_at ? new Date(message.created_at) : new Date(),
        title: `${message.type.charAt(0).toUpperCase() + message.type.slice(1)} sent`,
        description: `${message.tone} tone via ${message.channel}`,
        status: message.status,
        data: message,
      });
    });

    // Sort by date (newest first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [invoices, messages]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (type: string, status: string) => {
    const variants: Record<string, "outline" | "default" | "secondary" | "destructive"> = {
      draft: "outline",
      sent: "default",
      paid: "default",
      overdue: "destructive",
      void: "outline",
      queued: "outline",
      failed: "destructive",
    };

    const colors: Record<string, string> = {
      paid: "bg-green-100 text-green-800 border-green-200",
      sent: "bg-blue-100 text-blue-800 border-blue-200",
      overdue: "bg-red-100 text-red-800 border-red-200",
      draft: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return (
      <Badge 
        variant={variants[status] || "outline"}
        className={`text-xs ${colors[status] || ""}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (timelineItems.length === 0) {
    return (
      <EmptyState
        icon={<div className="w-8 h-8 bg-muted-foreground/20 rounded-full"></div>}
        title="No activity yet"
        description="Start by creating an invoice or sending a follow-up message to this client."
        action={{
          label: "Create Invoice",
          onClick: () => window.location.href = `/invoices/create?clientId=${clientId}`,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {timelineItems.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${
              item.type === 'invoice' 
                ? 'bg-green-500' 
                : 'bg-blue-500'
            }`}></div>
            {index < timelineItems.length - 1 && (
              <div className="w-px h-8 bg-border mt-2"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-body font-medium text-foreground">
                  {item.title}
                </h4>
                {item.description && (
                  <p className="text-body-small text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.amount && (
                  <span className="text-body-small font-medium">
                    ${item.amount.toLocaleString()}
                  </span>
                )}
                {item.status && getStatusBadge(item.type, item.status)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-body-small text-muted-foreground">
                {formatDate(item.date)}
              </p>
              
              {item.type === 'invoice' && (
                <Link href={`/invoices/${item.id}`}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary hover:text-primary/80"
                  >
                    View Invoice →
                  </Button>
                </Link>
              )}
            </div>

            {/* Message preview for messages */}
            {item.type === 'message' && (
              <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                <p className="text-body-small text-foreground line-clamp-2">
                  {(item.data as Message).body}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}