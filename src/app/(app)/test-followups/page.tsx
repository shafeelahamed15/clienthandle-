'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Send,
  Calendar,
  User
} from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export default function TestFollowupsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const addTestResult = (result: Omit<TestResult, 'timestamp'>) => {
    setTestResults(prev => [{
      ...result,
      timestamp: new Date().toISOString()
    }, ...prev]);
  };

  const testScheduledSend = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing scheduled follow-up send...');
      
      const response = await fetch('/api/test-followup-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      addTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Test completed successfully!' : 'Test failed'),
        details: result.details
      });

    } catch (error) {
      console.error('Test error:', error);
      addTestResult({
        success: false,
        message: 'Test failed with error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testEmailService = async () => {
    setIsLoading(true);
    try {
      console.log('📧 Testing email service...');
      
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'ClientHandle Test Email',
          body: 'This is a test email from your ClientHandle app!'
        })
      });

      const result = await response.json();
      
      addTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Email service test completed!' : 'Email test failed'),
        details: result.details
      });

    } catch (error) {
      console.error('Email test error:', error);
      addTestResult({
        success: false,
        message: 'Email test failed with error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Follow-up Testing Lab</h1>
          <p className="text-gray-600">Test your scheduled follow-up system in real-time</p>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">Test Scheduled Send</h3>
                <p className="text-sm text-gray-600">Send a scheduled follow-up immediately</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-4">
              This will find your most recent scheduled message and attempt to send it via email.
            </p>
            
            <Button
              onClick={testScheduledSend}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Test Send Now
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">Test Email Service</h3>
                <p className="text-sm text-gray-600">Verify Resend API integration</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-4">
              This will test if your email service (Resend) is properly configured and working.
            </p>
            
            <Button
              onClick={testEmailService}
              disabled={isLoading}
              variant="outline"
              className="w-full border-green-600 text-green-600 hover:bg-green-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Test Email API
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Test Results */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Test Results
            </h2>
            {testResults.length > 0 && (
              <Button
                onClick={clearResults}
                variant="outline"
                size="sm"
              >
                Clear Results
              </Button>
            )}
          </div>

          {testResults.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tests run yet</h3>
              <p className="text-gray-600">
                Click one of the test buttons above to start testing your follow-up system.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.success 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`p-1 rounded-full ${
                      result.success ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${
                          result.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {result.message}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </Badge>
                      </div>
                      
                      {result.details && (
                        <div className="mt-2">
                          {typeof result.details === 'string' ? (
                            <p className={`text-sm ${
                              result.success ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {result.details}
                            </p>
                          ) : (
                            <div className={`text-sm ${
                              result.success ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {result.details.messageId && (
                                <p><strong>Message ID:</strong> {result.details.messageId}</p>
                              )}
                              {result.details.subject && (
                                <p><strong>Subject:</strong> {result.details.subject}</p>
                              )}
                              {result.details.to && (
                                <p><strong>To:</strong> {result.details.to}</p>
                              )}
                              {result.details.client && (
                                <p><strong>Client:</strong> {result.details.client}</p>
                              )}
                              {result.details.emailSent !== undefined && (
                                <p><strong>Email Sent:</strong> {result.details.emailSent ? 'Yes' : 'No'}</p>
                              )}
                              {result.details.emailDetails && (
                                <p><strong>Details:</strong> {result.details.emailDetails}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-blue-900 mb-2">How to Test</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>1. Go to <strong>/followups</strong> and create a scheduled follow-up</p>
                <p>2. Come back here and click "Test Send Now" to send it immediately</p>
                <p>3. Check your email or the console logs to see if it worked</p>
                <p>4. If you have Resend API key configured, emails will be sent for real!</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}