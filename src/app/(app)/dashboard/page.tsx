"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { UpgradePrompt } from "@/components/dashboard/UpgradePrompt";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { getCurrentUser } from "@/lib/auth";
import { clientsService, invoicesService } from "@/lib/db";
import { 
  UsersIcon, 
  WarningIcon, 
  RevenueIcon, 
  MessagesIcon,
  BillingIcon,
  AddUserIcon,
  SendIcon,
  AnalyticsIcon,
  ClientHandleLogo
} from "@/components/icons";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    overdueInvoices: 0,
    thisWeekPaid: 0,
    pendingFollowups: 0,
  });
  const router = useRouter();

  const quickActions = [
    {
      label: "Start Smart Campaign",
      description: "AI-powered follow-ups that get replies",
      onClick: () => router.push("/followups?action=smart"),
      icon: <SendIcon size="sm" variant="accent" />,
      variant: "primary" as const,
    },
    {
      label: "Create Invoice",
      description: "Generate a new invoice for a client",
      onClick: () => router.push("/invoices/create"),
      icon: <BillingIcon size="sm" variant="success" />,
    },
    {
      label: "Add Client",
      description: "Add a new client to your database",
      onClick: () => router.push("/clients?action=add"),
      icon: <AddUserIcon size="sm" variant="accent" />,
    },
    {
      label: "View Reports",
      description: "Check your payment and client analytics",
      onClick: () => router.push("/reports"),
      icon: <AnalyticsIcon size="sm" variant="warning" />,
    },
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        console.log('🔍 Loading dashboard data...');
        
        // Check authentication
        
        const user = await getCurrentUser();
        if (!user) {
          console.log('❌ No authenticated user found - redirecting to sign-in');
          router.push('/sign-in');
          return;
        }

        console.log('✅ User authenticated:', {
          id: user.id,
          email: user.email,
          emailConfirmed: user.email_confirmed_at
        });

        try {
          console.log('📊 Fetching clients data...');
          const clients = await clientsService.list(user.id);
          console.log('✅ Clients loaded:', clients.length);

          console.log('📋 Fetching invoices data...');
          const invoices = await invoicesService.list(user.id);
          console.log('✅ Invoices loaded:', invoices.length);

          const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
          const paidThisWeek = invoices.filter(inv => 
            inv.status === 'paid' && 
            inv.updated_at && 
            new Date(inv.updated_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
          ).length;

          // Calculate actual revenue from paid invoices this week
          const actualRevenue = invoices.filter(inv => 
            inv.status === 'paid' && 
            inv.updated_at && 
            new Date(inv.updated_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
          ).reduce((total, inv) => total + (inv.amount_cents / 100), 0);

          setStats({
            totalClients: clients.length,
            overdueInvoices,
            thisWeekPaid: Math.round(actualRevenue),
            pendingFollowups: overdueInvoices,
          });

          console.log('✅ Dashboard stats updated:', {
            totalClients: clients.length,
            overdueInvoices,
            thisWeekPaid: Math.round(actualRevenue),
            pendingFollowups: overdueInvoices
          });

        } catch (dataError: unknown) {
          const error = dataError as Error;
          console.error('❌ Error loading dashboard data:', {
            error: dataError,
            message: error.message,
            code: (error as { code?: string }).code
          });
          
          if (error.message?.includes('permission')) {
            console.error('🚨 PERMISSIONS ERROR: This is likely a RLS policy issue');
          }
        }

      } catch (authError: unknown) {
        const error = authError as Error;
        console.error("❌ Failed to load dashboard data:", {
          error: authError,
          message: error.message,
          code: (error as { code?: string }).code
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading your dashboard..." />
      </div>
    );
  }

  const hasData = stats.totalClients > 0;

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-100 to-blue-100/30 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Good morning! 👋</h1>
        <p className="text-lg text-gray-600">
          Here&apos;s what&apos;s happening with your freelance business today.
        </p>
      </div>

      {hasData ? (
        <>
          {/* Smart Follow-ups Hero Card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    🤖
                  </div>
                  <h2 className="text-xl font-semibold">Smart Follow-up Campaigns</h2>
                </div>
                <p className="text-blue-100 mb-4 text-sm">
                  Set up once, let AI handle all your follow-ups automatically with creative variations that get replies.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs border border-white/20">✨ AI-Powered</div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs border border-white/20">📅 Auto-Scheduled</div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs border border-white/20">🎯 Reply-Focused</div>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center text-4xl backdrop-blur-sm border border-white/20">
                  📧
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => router.push("/followups?action=smart")}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                🚀 Start Smart Campaign
              </button>
              <button 
                onClick={() => router.push("/followups?action=manage")}
                className="bg-white/20 border border-white/30 text-white px-6 py-2 rounded-lg font-medium hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
              >
                📊 Manage Campaigns
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Clients"
              value={stats.totalClients}
              description="Active clients in your database"
              icon={<UsersIcon size="md" variant="accent" />}
              action={{
                label: "View all clients",
                onClick: () => router.push("/clients"),
              }}
            />
            
            <StatsCard
              title="Overdue Invoices"
              value={stats.overdueInvoices}
              description="Invoices waiting for payment"
              icon={<WarningIcon size="md" variant="error" />}
              trend={stats.overdueInvoices > 0 ? {
                value: 0,
                label: "vs last week",
                positive: false,
              } : undefined}
              action={{
                label: "Send reminders",
                onClick: () => router.push("/invoices?filter=overdue"),
              }}
            />
            
            <StatsCard
              title="This Week Paid"
              value={`$${stats.thisWeekPaid.toLocaleString()}`}
              description="Revenue collected this week"
              icon={<RevenueIcon size="md" variant="success" />}
              trend={stats.thisWeekPaid > 0 ? {
                value: 0,
                label: "vs last week",
                positive: true,
              } : undefined}
            />
            
            <StatsCard
              title="Pending Follow-ups"
              value={stats.pendingFollowups}
              description="Messages waiting to be sent"
              icon={<MessagesIcon size="md" variant="accent" />}
              action={{
                label: "Compose messages",
                onClick: () => router.push("/followups"),
              }}
            />
          </div>

          {/* Quick Actions */}
          <QuickActions actions={quickActions} />
          
          {/* Upgrade Prompt for Free Users */}
          <UpgradePrompt />

          {/* Recent Activity */}
          <div className="bg-gray-50/70 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Recent Activity</h2>
            <p className="text-gray-600">
              Recent activity will appear here as you use ClientHandle.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Smart Follow-ups Hero for New Users */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white shadow-lg text-center backdrop-blur-sm border border-white/10">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 backdrop-blur-sm border border-white/20">
              🤖
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Smart Follow-ups!</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              The core feature that makes ClientHandle magical. Set up AI-powered campaigns that automatically send personalized follow-ups to get more replies and close more deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => router.push("/clients?action=add")}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                🚀 Add First Client & Start Campaign
              </button>
              <button 
                onClick={() => router.push("/followups?demo=true")}
                className="bg-white/20 border border-white/30 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
              >
                👀 See How It Works
              </button>
            </div>
          </div>

          <EmptyState
            icon={<ClientHandleLogo size="xl" />}
            title="Let's set up your first Smart Campaign!"
            description="Add a client, tell our AI about them, and watch as personalized follow-ups get sent automatically. Most users see replies within the first week."
            action={{
              label: "Add Your First Client",
              onClick: () => router.push("/clients?action=add"),
            }}
          />
        </>
      )}
    </div>
  );
}