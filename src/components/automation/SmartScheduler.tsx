"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Smart Scheduler - Optimized for real follow-up patterns
 * Processes every 4 hours when active (perfect for 2-day, weekly, monthly cycles)
 * Triggers immediately when user returns after 2+ hours
 */
export function SmartScheduler() {
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processAutomation = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Process pending follow-ups
      const response = await fetch('/api/automation/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const now = new Date();
        console.log('✅ Automation processed successfully');
        setLastCheck(now);
        localStorage.setItem('lastAutomationCheck', now.toISOString());
      }
    } catch (error) {
      console.error('❌ Automation processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Check for pending automation every 4 hours when user is active
    const interval = setInterval(() => {
      const now = new Date();
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      
      // Only process if user hasn't checked recently
      if (!lastCheck || lastCheck < fourHoursAgo) {
        processAutomation();
      }
    }, 4 * 60 * 60 * 1000); // 4 hours

    // Process on load only if it's been more than 4 hours
    const now = new Date();
    const stored = localStorage.getItem('lastAutomationCheck');
    const lastStoredCheck = stored ? new Date(stored) : null;
    
    if (!lastStoredCheck || now.getTime() - lastStoredCheck.getTime() > 4 * 60 * 60 * 1000) {
      processAutomation();
    }

    return () => clearInterval(interval);
  }, [lastCheck]);

  // Process when user comes back to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && (!lastCheck || Date.now() - lastCheck.getTime() > 2 * 60 * 60 * 1000)) {
        processAutomation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastCheck]);

  return null; // This component works invisibly
}