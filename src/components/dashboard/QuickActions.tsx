"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickAction {
  label: string;
  description: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "outline";
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card className="border border-gray-200/50 shadow-lg bg-gray-50/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-semibold text-gray-800">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "outline"}
              onClick={action.onClick}
              className="h-auto p-4 flex flex-col items-start gap-2 text-left transition-all duration-200 border-gray-200 bg-gray-50/80 hover:bg-gray-100/80 hover:shadow-md hover:-translate-y-0.5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 w-full">
                {action.icon && (
                  <div className="w-4 h-4 flex-shrink-0">
                    {action.icon}
                  </div>
                )}
                <span className="font-medium text-body-small">
                  {action.label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {action.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}