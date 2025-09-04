"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingState } from "@/components/common/LoadingState";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { SmartScheduler } from "@/components/automation/SmartScheduler";
import { ToastProvider } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { HomeIcon, UsersIcon, InvoicesIcon, MessagesIcon, SettingsIcon } from "@/components/icons";

const sidebarItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <HomeIcon size="sm" />,
  },
  {
    href: "/clients",
    label: "Clients",
    icon: <UsersIcon size="sm" />,
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: <InvoicesIcon size="sm" />,
  },
  {
    href: "/followups",
    label: "Follow-ups",
    icon: <MessagesIcon size="sm" />,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <SettingsIcon size="sm" />,
  },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  // AUTHENTICATION REQUIRED - SECURITY ENABLED
  useEffect(() => {
    if (!loading && !user) {
      console.log('🔒 No authenticated user, redirecting to sign-in');
      router.push("/sign-in");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingState message="Loading your workspace..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="h-screen flex bg-gradient-to-br from-slate-100 to-blue-100/30">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200/50">
          <AppSidebar items={sidebarItems} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-100/50 to-blue-100/20 relative">
          <Topbar 
            user={{
              displayName: profile?.display_name || user?.user_metadata?.display_name || "Development User",
              email: user?.email || "dev@clienthandle.com",
            }}
          />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        {/* Floating Feedback Widget */}
        <FeedbackWidget />
        
        {/* Smart Scheduler - Disabled during auth bypass */}
        {/* <SmartScheduler /> */}
      </div>
    </ToastProvider>
  );
}