'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function TestRealEmailPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    to: '',
    subject: 'Test Email from ClientHandle',
    message: 'This is a test email to verify that the email system is working properly.\n\nIf you receive this email, the integration is successful!'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.to || !formData.subject || !formData.message) {
      setResult({ error: 'Please fill in all fields' });
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test-real-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        // Clear form after success
        setFormData(prev => ({ ...prev, to: '' }));
      }
      
    } catch (error) {
      setResult({ error: 'Failed to send email', details: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
            <Mail className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Test Real Email System</h1>
          </div>
          <p className="text-gray-600">
            Send a real email using Resend to test the integration
          </p>
        </div>

        {/* Email Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* To Field */}
            <div className="space-y-2">
              <Label htmlFor="to">To Email Address *</Label>
              <Input
                id="to"
                type="email"
                placeholder="recipient@example.com"
                value={formData.to}
                onChange={(e) => updateFormData('to', e.target.value)}
                required
                className="text-sm"
              />
            </div>

            {/* Subject Field */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Email subject line"
                value={formData.subject}
                onChange={(e) => updateFormData('subject', e.target.value)}
                required
                className="text-sm"
              />
            </div>

            {/* Message Field */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Email message content"
                value={formData.message}
                onChange={(e) => updateFormData('message', e.target.value)}
                required
                rows={6}
                className="text-sm resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Results */}
        {result && (
          <Card className="p-6">
            <div className="space-y-3">
              
              {/* Success Result */}
              {result.success && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-800">Email Sent Successfully!</h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-600">Message ID:</span>
                        <Badge variant="outline" className="ml-2 font-mono text-xs">
                          {result.messageId}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-600">Provider:</span>
                        <Badge className="ml-2 bg-blue-100 text-blue-800">
                          {result.provider}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-green-700 text-sm">
                      ✅ The email system is working properly! Check the recipient's inbox.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Result */}
              {result.error && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-red-800">Email Failed</h3>
                    <p className="text-red-700 text-sm">{result.error}</p>
                    {result.details && (
                      <p className="text-red-600 text-xs font-mono bg-red-50 p-2 rounded">
                        {JSON.stringify(result.details, null, 2)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="space-y-3">
            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              How to Test
            </h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Enter your email address in the "To" field</li>
              <li>Customize the subject and message if needed</li>
              <li>Click "Send Test Email"</li>
              <li>Check your inbox (including spam folder)</li>
              <li>Verify the email was received with proper formatting</li>
            </ol>
            <p className="text-xs text-blue-600 mt-3">
              💡 This bypasses the database and sends emails directly through Resend
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}