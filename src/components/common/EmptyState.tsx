import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'gradient' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  secondaryAction,
  variant = 'gradient',
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-16',
    lg: 'py-24'
  };
  
  const iconSizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  };
  
  if (variant === 'minimal') {
    return (
      <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} px-6 text-center`}>
        {icon && (
          <div className={`${iconSizes[size]} mb-4 flex items-center justify-center bg-gray-100 rounded-2xl`}>
            {icon}
          </div>
        )}
        <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-md">{description}</p>
        {action && (
          <Button onClick={action.onClick} className="bg-blue-600 hover:bg-blue-700">
            {action.label}
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} px-6 text-center relative`}>
      {/* Background decoration */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <div className="w-96 h-96 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative">
        {icon && (
          <div className="relative mb-8">
            <div className={`${iconSizes[size]} mx-auto flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl shadow-lg border border-blue-100`}>
              {icon}
            </div>
            {variant === 'gradient' && (
              <>
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 -left-4 w-3 h-3 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
              </>
            )}
          </div>
        )}
        
        <div className="space-y-4 max-w-lg">
          <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            {title}
          </h3>
          <p className="text-lg text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
        
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            {action && (
              <Button 
                onClick={action.onClick}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                size="lg"
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button 
                variant="outline"
                onClick={secondaryAction.onClick}
                className="border-2 border-gray-200 hover:bg-gray-50 text-gray-700 px-8 py-3 hover:border-gray-300 transition-all duration-200"
                size="lg"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}