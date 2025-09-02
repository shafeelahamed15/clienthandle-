'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Volume2, Heart, Briefcase, Zap, Clock, MessageCircle, AlertTriangle, Smile } from 'lucide-react';

interface ToneOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  example: string;
  preview: string;
  useCase: string;
}

const toneOptions: ToneOption[] = [
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm and approachable',
    icon: <Heart className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800',
    example: 'Hey [Name]! Hope you\'re doing well. Just wanted to follow up...',
    preview: 'Warm, personal, and conversational tone that builds rapport',
    useCase: 'Best for: Existing clients, ongoing relationships'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Polished and business-like',
    icon: <Briefcase className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800',
    example: 'Dear [Name], I hope this email finds you well. I wanted to follow up regarding...',
    preview: 'Formal yet approachable, maintaining professional boundaries',
    useCase: 'Best for: New clients, formal business relationships'
  },
  {
    id: 'firm',
    name: 'Firm',
    description: 'Direct and assertive',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800',
    example: 'Dear [Name], I need to bring to your attention...',
    preview: 'Clear, direct, and assertive while remaining professional',
    useCase: 'Best for: Overdue payments, urgent matters'
  },
  {
    id: 'gentle',
    name: 'Gentle',
    description: 'Soft and understanding',
    icon: <Smile className="w-4 h-4" />,
    color: 'bg-pink-100 text-pink-800',
    example: 'Hi [Name], I understand things can get busy. Just a gentle reminder...',
    preview: 'Empathetic and understanding, acknowledging client\'s situation',
    useCase: 'Best for: First reminders, understanding delays'
  },
  {
    id: 'urgent',
    name: 'Urgent',
    description: 'Time-sensitive and direct',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-red-100 text-red-800',
    example: 'URGENT: [Name], this requires immediate attention...',
    preview: 'Creates urgency while maintaining professionalism',
    useCase: 'Best for: Final notices, time-critical matters'
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Relaxed and informal',
    icon: <MessageCircle className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800',
    example: 'Hi [Name]! Quick check-in about...',
    preview: 'Relaxed and informal, like chatting with a colleague',
    useCase: 'Best for: Creative clients, informal relationships'
  },
  {
    id: 'helpful_service',
    name: 'Helpful Service',
    description: 'Supportive and service-oriented',
    icon: <Volume2 className="w-4 h-4" />,
    color: 'bg-indigo-100 text-indigo-800',
    example: 'Hi [Name], I\'m here to help make this as easy as possible...',
    preview: 'Emphasizes support and assistance, customer service focused',
    useCase: 'Best for: Offering help, resolving issues'
  },
  {
    id: 'assertive',
    name: 'Assertive',
    description: 'Confident and clear',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-800',
    example: 'Dear [Name], I need to address this matter directly...',
    preview: 'Confident and clear expectations without being harsh',
    useCase: 'Best for: Setting boundaries, clear expectations'
  }
];

interface EnhancedToneSelectorProps {
  selectedTone: string;
  onToneChange: (toneId: string) => void;
  onPreview?: (preview: string) => void;
  className?: string;
}

export function EnhancedToneSelector({ 
  selectedTone, 
  onToneChange, 
  onPreview,
  className = '' 
}: EnhancedToneSelectorProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [hoveredTone, setHoveredTone] = useState<string | null>(null);

  const selectedToneOption = toneOptions.find(option => option.id === selectedTone);

  const handleToneSelect = (toneId: string) => {
    onToneChange(toneId);
    const selectedOption = toneOptions.find(option => option.id === toneId);
    if (onPreview && selectedOption) {
      onPreview(selectedOption.preview);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Choose Email Tone</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewMode(!previewMode)}
          className="text-xs"
        >
          {previewMode ? 'Hide' : 'Show'} Previews
        </Button>
      </div>

      {/* Tone Options Grid */}
      <div className="grid grid-cols-2 gap-3">
        {toneOptions.map((option) => (
          <Card
            key={option.id}
            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedTone === option.id 
                ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50' 
                : 'hover:border-gray-300'
            }`}
            onClick={() => handleToneSelect(option.id)}
            onMouseEnter={() => setHoveredTone(option.id)}
            onMouseLeave={() => setHoveredTone(null)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Badge className={`${option.color} px-2 py-1 flex items-center gap-1`}>
                  {option.icon}
                  <span className="text-xs font-medium">{option.name}</span>
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 mb-1">{option.description}</p>
                <p className="text-xs text-gray-500">{option.useCase}</p>
              </div>
            </div>

            {/* Preview on Hover */}
            {(hoveredTone === option.id || selectedTone === option.id) && previewMode && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-600 mb-2 font-medium">Preview:</p>
                <p className="text-xs text-gray-500 italic">&quot;{option.example}&quot;</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Selected Tone Summary */}
      {selectedToneOption && (
        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="flex items-start gap-3">
            <Badge className={`${selectedToneOption.color} px-2 py-1 flex items-center gap-1`}>
              {selectedToneOption.icon}
              <span className="text-xs font-medium">{selectedToneOption.name}</span>
            </Badge>
            <div className="flex-1">
              <p className="text-sm text-gray-700 mb-1">{selectedToneOption.preview}</p>
              <p className="text-xs text-gray-500">{selectedToneOption.useCase}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Custom Tone Option */}
      <Card className="p-4 border-dashed border-gray-300 bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Need a custom tone?</p>
          <Button variant="outline" size="sm" disabled>
            Custom Tone (Coming Soon)
          </Button>
        </div>
      </Card>
    </div>
  );
}