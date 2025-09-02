'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

function UnsubscribeSuccessContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams?.get('client')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-semibold mb-4">
          Successfully Unsubscribed
        </h1>
        
        <p className="text-gray-600 mb-6">
          You have been successfully unsubscribed from all future emails. 
          We&rsquo;re sorry to see you go, but we respect your choice.
        </p>

        {clientId && (
          <p className="text-sm text-gray-500 mb-6">
            Reference ID: {clientId.slice(0, 8)}
          </p>
        )}

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            You will no longer receive:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Follow-up emails</li>
            <li>• Payment reminders</li>
            <li>• Project updates</li>
          </ul>
        </div>

        <div className="mt-8">
          <Button 
            variant="outline" 
            onClick={() => window.close()}
            className="w-full"
          >
            Close Window
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          If this was a mistake, please contact the sender directly.
        </p>
      </Card>
    </div>
  )
}

export default function UnsubscribeSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-semibold mb-4">Loading...</h1>
        </Card>
      </div>
    }>
      <UnsubscribeSuccessContent />
    </Suspense>
  )
}