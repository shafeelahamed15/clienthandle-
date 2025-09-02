'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function UnsubscribeErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <AlertCircle className="w-16 h-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-semibold mb-4">
          Unsubscribe Error
        </h1>
        
        <p className="text-gray-600 mb-6">
          We encountered an issue processing your unsubscribe request. 
          This may be due to an invalid or expired link.
        </p>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-900 mb-2">What you can do:</h3>
            <ul className="text-sm text-red-800 space-y-1 text-left">
              <li>• Reply directly to the email with &ldquo;UNSUBSCRIBE&rdquo;</li>
              <li>• Contact the sender to request removal</li>
              <li>• Try the unsubscribe link again from the original email</li>
            </ul>
          </div>

          <Button 
            variant="outline" 
            onClick={() => window.close()}
            className="w-full"
          >
            Close Window
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          We apologize for any inconvenience caused.
        </p>
      </Card>
    </div>
  )
}