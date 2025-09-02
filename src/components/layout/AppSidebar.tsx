"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClientHandleLogo } from "@/components/icons";

interface SidebarItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface AppSidebarProps {
  items: SidebarItem[];
}

export function AppSidebar({ items }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-gray-50/70 backdrop-blur-md">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200/50">
        <Link href="/dashboard" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-semibold text-gray-800 transition-colors duration-200 group-hover:text-blue-600">
            ClientHandle
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {items.map((item, index) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={index}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive 
                      ? "bg-blue-600 text-white shadow-lg backdrop-blur-sm border border-blue-700/20" 
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100/50 hover:shadow-md"
                  )}
                >
                  {item.icon && (
                    <div className="w-4 h-4 flex-shrink-0">
                      {item.icon}
                    </div>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/50">
        <p className="text-xs text-gray-500 text-center">
          Built with premium attention to detail
        </p>
      </div>
    </div>
  );
}