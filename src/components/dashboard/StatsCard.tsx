import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  trend, 
  icon, 
  action 
}: StatsCardProps) {
  return (
    <Card className="border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-200 bg-gray-50/70 backdrop-blur-sm hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {icon && (
                <div className="w-5 h-5 text-gray-600">
                  {icon}
                </div>
              )}
              <p className="text-sm font-medium text-gray-600">
                {title}
              </p>
            </div>
            <p className="text-3xl font-semibold text-gray-800 mb-1">
              {value}
            </p>
            {description && (
              <p className="text-sm text-gray-600">
                {description}
              </p>
            )}
          </div>
        </div>

        {trend && (
          <div className="flex items-center gap-2 mt-4">
            <Badge 
              variant={trend.positive !== false ? "default" : "destructive"}
              className="text-xs"
            >
              {trend.positive !== false ? "+" : ""}{trend.value}%
            </Badge>
            <span className="text-body-small text-muted-foreground">
              {trend.label}
            </span>
          </div>
        )}

        {action && (
          <button
            onClick={action.onClick}
            className="mt-4 text-body-small font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {action.label} →
          </button>
        )}
      </CardContent>
    </Card>
  );
}