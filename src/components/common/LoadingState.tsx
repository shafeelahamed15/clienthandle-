interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'minimal';
}

export function LoadingState({ 
  message = "Loading...", 
  size = 'md',
  variant = 'gradient' 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-16',
    lg: 'py-24'
  };
  
  const spinnerSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };
  
  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`${spinnerSizes[size]} border-2 border-gray-200 rounded-full`}></div>
            <div className={`absolute top-0 left-0 ${spinnerSizes[size]} border-2 border-blue-600 border-t-transparent rounded-full animate-spin`}></div>
          </div>
          <span className="text-gray-600 font-medium">{message}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} px-6`}>
      <div className="relative mb-6">
        {variant === 'gradient' ? (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-200 to-indigo-200 opacity-20 animate-pulse"></div>
            <div className="relative">
              <div className={`${spinnerSizes[size]} border-3 border-gray-200 rounded-full`}></div>
              <div className={`absolute top-0 left-0 ${spinnerSizes[size]} border-3 border-transparent rounded-full animate-spin`} style={{
                background: 'conic-gradient(from 0deg, transparent, #3b82f6, #6366f1, transparent)',
                borderRadius: '50%',
                mask: 'radial-gradient(circle at center, transparent 40%, black 42%)'
              }}></div>
            </div>
          </>
        ) : (
          <>
            <div className={`${spinnerSizes[size]} border-2 border-gray-200 rounded-full`}></div>
            <div className={`absolute top-0 left-0 ${spinnerSizes[size]} border-2 border-blue-600 border-t-transparent rounded-full animate-spin`}></div>
          </>
        )}
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-gray-900 mb-2">{message}</p>
        <p className="text-sm text-gray-500">Please wait a moment...</p>
      </div>
      
      {/* Animated dots */}
      <div className="flex space-x-1 mt-4">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}

export function LoadingCard({ variant = 'default' }: { variant?: 'default' | 'stats' | 'timeline' }) {
  if (variant === 'stats') {
    return (
      <div className="animate-pulse bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/3"></div>
            <div className="h-8 bg-gradient-to-r from-blue-200 to-indigo-200 rounded w-2/3"></div>
            <div className="h-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-1/2"></div>
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }
  
  if (variant === 'timeline') {
    return (
      <div className="animate-pulse bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-6 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full"></div>
          <div className="w-24 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
        </div>
        <div className="h-6 bg-gradient-to-r from-gray-300 to-gray-400 rounded w-3/4"></div>
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl space-y-2">
          <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full"></div>
          <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-4/5"></div>
          <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
        </div>
        <div className="flex space-x-2">
          <div className="w-12 h-6 bg-gradient-to-r from-purple-200 to-indigo-200 rounded"></div>
          <div className="w-16 h-6 bg-gradient-to-r from-green-200 to-emerald-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="animate-pulse bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="space-y-4">
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-1/2"></div>
        <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-200 to-gray-300 rounded ${className}`}></div>
  );
}

// Multiple loading cards for lists
export function LoadingCardList({ count = 3, variant = 'default' }: { count?: number; variant?: 'default' | 'stats' | 'timeline' }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <LoadingCard key={index} variant={variant} />
      ))}
    </div>
  );
}