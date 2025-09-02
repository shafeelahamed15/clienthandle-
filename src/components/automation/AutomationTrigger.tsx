"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock } from 'lucide-react';

/**
 * Manual automation trigger for users who want immediate processing
 */
export function AutomationTrigger() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const triggerAutomation = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/automation/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Manual automation triggered:', data);
        setLastRun(new Date());
        
        // Show success feedback
        if (data.processed > 0) {
          // Could show a toast notification here
          console.log(`📧 Sent ${data.processed} scheduled messages`);
        }
      }
    } catch (error) {
      console.error('❌ Manual automation error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={triggerAutomation}
        disabled={isProcessing}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Clock className="w-3 h-3 mr-1" />
            Send Scheduled
          </>
        )}
      </Button>
      
      {lastRun && (
        <span className="text-xs text-gray-500">
          Last run: {lastRun.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}