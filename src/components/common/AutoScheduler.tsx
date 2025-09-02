'use client';

import { useEffect, useState } from 'react';

export function AutoScheduler() {
  const [lastCheck, setLastCheck] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Run auto-scheduler every 5 minutes when the app is open
    const runScheduler = async () => {
      if (isRunning) return;
      
      try {
        setIsRunning(true);
        console.log('🔄 Running auto-scheduler...');
        
        const response = await fetch('/api/auto-scheduler');
        const result = await response.json();
        
        if (result.success && result.successCount > 0) {
          console.log(`📧 Auto-scheduler sent ${result.successCount} emails`);
        }
        
        setLastCheck(new Date().toLocaleTimeString());
        
      } catch (error) {
        console.error('❌ Auto-scheduler error:', error);
      } finally {
        setIsRunning(false);
      }
    };

    // Initial run
    runScheduler();
    
    // Then every 5 minutes
    const interval = setInterval(runScheduler, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [isRunning]);

  // Only show in development or if there's activity
  if (process.env.NODE_ENV === 'production' && !lastCheck) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 z-50">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
        <span>Auto-scheduler {isRunning ? 'running' : 'active'}</span>
        {lastCheck && <span className="text-blue-500">Last: {lastCheck}</span>}
      </div>
    </div>
  );
}