'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, Briefcase, AlertCircle } from 'lucide-react'

export type Tone = 'friendly' | 'professional' | 'firm'

interface ToneSelectorProps {
  selectedTone: Tone
  onToneChange: (tone: Tone) => void
  className?: string
}

const toneOptions = [
  {
    id: 'friendly' as const,
    name: 'Friendly',
    icon: Heart,
    description: 'Warm and personal',
    color: 'bg-green-100 text-green-700 border-green-200',
    selectedColor: 'bg-green-600 text-white border-green-600',
    example: '"Hope you\'re doing well! Just checking in about..."'
  },
  {
    id: 'professional' as const,
    name: 'Professional',
    icon: Briefcase,
    description: 'Business formal',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    selectedColor: 'bg-blue-600 text-white border-blue-600',
    example: '"I wanted to follow up regarding our recent..."'
  },
  {
    id: 'firm' as const,
    name: 'Firm',
    icon: AlertCircle,
    description: 'Direct and clear',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    selectedColor: 'bg-orange-600 text-white border-orange-600',
    example: '"This is a reminder that payment is now..."'
  }
]

export function ToneSelector({ selectedTone, onToneChange, className = '' }: ToneSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <h3 className="text-sm font-medium text-gray-700">Select Tone</h3>
        <Badge variant="secondary" className="text-xs">
          Choose your communication style
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {toneOptions.map((option) => {
          const Icon = option.icon
          const isSelected = selectedTone === option.id
          
          return (
            <Card
              key={option.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md' 
                  : 'hover:ring-1 hover:ring-gray-300'
              }`}
              onClick={() => onToneChange(option.id)}
            >
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? option.selectedColor : option.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{option.name}</h4>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                  {isSelected && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    </div>
                  )}
                </div>
                
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 italic">
                  {option.example}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      
      {/* Tone descriptions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-xs text-blue-700">
          <strong>💡 Tip:</strong> {
            selectedTone === 'friendly' ? 'Friendly tone works best for regular clients and casual relationships.' :
            selectedTone === 'professional' ? 'Professional tone is perfect for corporate clients and formal communications.' :
            'Firm tone is effective for overdue payments and when you need clear action.'
          }
        </div>
      </div>
    </div>
  )
}