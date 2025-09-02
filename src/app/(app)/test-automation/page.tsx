'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function TestAutomationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runAutomationTest = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      console.log('🔄 Starting automation test...');
      
      // Call the auto-scheduler endpoint directly
      const response = await fetch('/api/auto-scheduler', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📧 Automation results:', data);
      setResults(data);

    } catch (err) {
      console.error('❌ Automation test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Test Automation System</h1>
        <p className="text-gray-600">
          Test the scheduled follow-up automation system to see if messages are being sent correctly.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Run Automation Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            This will trigger the auto-scheduler to process any pending scheduled messages and attempt to send them.
          </p>
          
          <Button 
            onClick={runAutomationTest} 
            disabled={isRunning}
            className="w-full sm:w-auto"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Automation Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Test Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{results.processed || 0}</div>
                <div className="text-sm text-blue-700">Messages Processed</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{results.successCount || 0}</div>
                <div className="text-sm text-green-700">Sent Successfully</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{results.errorCount || 0}</div>
                <div className="text-sm text-red-700">Failed to Send</div>
              </div>
            </div>

            {results.message && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">System Message:</div>
                <div className="text-gray-600">{results.message}</div>
              </div>
            )}

            {results.results && results.results.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Individual Message Results:</h3>
                <div className="space-y-2">
                  {results.results.map((result: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="text-sm">Message ID: {result.messageId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                        {result.emailId && (
                          <span className="text-xs text-gray-500">Email ID: {result.emailId}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.success === false && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800">Note:</div>
                <div className="text-yellow-700 text-sm">
                  {results.details || 'The automation system encountered an issue. Check the logs for more details.'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}