"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface TopbarProps {
  user?: {
    displayName: string;
    email: string;
  };
}

export function Topbar({ user }: TopbarProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    await signOutUser();
    router.push("/");
  };

  return (
    <header className="h-16 border-b border-gray-200/50 bg-gray-50/60 backdrop-blur supports-[backdrop-filter]:bg-gray-50/50">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-800">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Search - will be implemented later */}
          <div className="hidden md:block">
            <Button 
              variant="outline" 
              size="sm" 
              className="transition-all duration-200 border-gray-200 bg-gray-50/80 hover:bg-gray-100 hover:shadow-md"
            >
              Quick search...
            </Button>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                <span className="text-sm font-medium text-white">
                  {user?.displayName?.charAt(0).toUpperCase() || "U"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 border-0 shadow-lg bg-gray-50/95 backdrop-blur-md"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-gray-800">
                    {user?.displayName || "User"}
                  </p>
                  <p className="text-xs text-gray-600">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-2"
                  onClick={() => router.push("/settings")}
                >
                  Settings
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-2"
                  onClick={() => router.push("/pricing")}
                >
                  Pricing & Plans
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto p-2"
                >
                  Help & Support
                </Button>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto p-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                  disabled={loading}
                >
                  {loading ? "Signing out..." : "Sign out"}
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}