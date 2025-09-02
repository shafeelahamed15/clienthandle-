'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, Repeat, Send, Timer, Zap } from 'lucide-react'

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months'

interface SchedulePattern {
  type: RecurrenceType
  interval: number
  timeUnit: TimeUnit
  endAfter?: number
  endDate?: Date
  daysOfWeek?: number[]  // 0-6 (Sunday-Saturday)
  timeOfDay: string      // HH:MM format
}

interface EmailSchedulerProps {
  onSchedule: (pattern: SchedulePattern) => void
  disabled?: boolean
  className?: string
}

export function EmailScheduler({ onSchedule, disabled = false, className = '' }: EmailSchedulerProps) {
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly')
  const [interval, setInterval] = useState(1)
  const [timeOfDay, setTimeOfDay] = useState('09:00')
  const [endType, setEndType] = useState<'never' | 'after' | 'date'>('never')
  const [endAfter, setEndAfter] = useState(5)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]) // Mon, Wed, Fri

  const timeSlots = [
    { value: '09:00', label: '9:00 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '13:00', label: '1:00 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '15:00', label: '3:00 PM' },
    { value: '16:00', label: '4:00 PM' },
    { value: '17:00', label: '5:00 PM' },
  ]

  const recurrenceOptions = [
    { 
      value: 'once', 
      label: 'Send Once',
      description: 'Single email delivery',
      icon: Send 
    },
    { 
      value: 'daily', 
      label: 'Daily',
      description: 'Every day at set time',
      icon: Calendar 
    },
    { 
      value: 'weekly', 
      label: 'Weekly',
      description: 'Specific days each week',
      icon: Repeat 
    },
    { 
      value: 'monthly', 
      label: 'Monthly',
      description: 'Same date each month',
      icon: Calendar 
    },
    { 
      value: 'yearly', 
      label: 'Yearly',
      description: 'Annual reminder',
      icon: Calendar 
    }
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    )
  }

  const handleSchedule = () => {
    const pattern: SchedulePattern = {
      type: isRecurring ? recurrenceType : 'once',
      interval,
      timeUnit: getTimeUnit(recurrenceType),
      timeOfDay,
      ...(recurrenceType === 'weekly' && { daysOfWeek: selectedDays }),
      ...(endType === 'after' && { endAfter }),
    }

    onSchedule(pattern)
  }

  const getTimeUnit = (type: RecurrenceType): TimeUnit => {
    switch (type) {
      case 'daily': return 'days'
      case 'weekly': return 'weeks'
      case 'monthly': return 'months'
      case 'yearly': return 'months'
      default: return 'days'
    }
  }

  const getSchedulePreview = () => {
    if (!isRecurring) return 'Will send once immediately'

    let preview = `Every ${interval > 1 ? interval + ' ' : ''}`
    
    switch (recurrenceType) {
      case 'daily':
        preview += `${interval > 1 ? 'days' : 'day'} at ${timeOfDay}`
        break
      case 'weekly':
        preview += `${interval > 1 ? 'weeks' : 'week'} on ${selectedDays.map(d => dayNames[d]).join(', ')} at ${timeOfDay}`
        break
      case 'monthly':
        preview += `${interval > 1 ? 'months' : 'month'} at ${timeOfDay}`
        break
      case 'yearly':
        preview += `year at ${timeOfDay}`
        break
    }

    if (endType === 'after') {
      preview += ` (${endAfter} times)`
    }

    return preview
  }

  return (
    <Card className={`p-6 bg-white/50 backdrop-blur border-gray-200 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Email Scheduling</h3>
        </div>

        {/* Recurring Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Recurring Follow-ups</Label>
            <p className="text-xs text-gray-500 mt-1">
              Schedule multiple follow-ups automatically
            </p>
          </div>
          <Switch 
            checked={isRecurring} 
            onCheckedChange={setIsRecurring}
            disabled={disabled}
          />
        </div>

        {isRecurring && (
          <>
            <Separator />

            {/* Recurrence Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Frequency</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {recurrenceOptions.slice(1).map((option) => {
                  const Icon = option.icon
                  const isSelected = recurrenceType === option.value
                  
                  return (
                    <Card
                      key={option.value}
                      className={`p-3 cursor-pointer transition-all ${
                        isSelected 
                          ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setRecurrenceType(option.value as RecurrenceType)}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                        <div>
                          <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Interval */}
            {['daily', 'weekly', 'monthly'].includes(recurrenceType) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Every</Label>
                  <Select value={interval.toString()} onValueChange={(value) => setInterval(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {recurrenceType === 'daily' ? (num > 1 ? 'days' : 'day') :
                               recurrenceType === 'weekly' ? (num > 1 ? 'weeks' : 'week') :
                               recurrenceType === 'monthly' ? (num > 1 ? 'months' : 'month') : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Time</Label>
                  <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(slot => (
                        <SelectItem key={slot.value} value={slot.value}>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>{slot.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Days of Week (Weekly only) */}
            {recurrenceType === 'weekly' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Days of the Week</Label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((day, index) => (
                    <Button
                      key={day}
                      variant={selectedDays.includes(index) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDayToggle(index)}
                      className="w-12 h-8 p-0"
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* End Conditions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Stop Condition</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="never"
                    name="endType"
                    checked={endType === 'never'}
                    onChange={() => setEndType('never')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label htmlFor="never" className="text-sm">Continue indefinitely</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="after"
                    name="endType"
                    checked={endType === 'after'}
                    onChange={() => setEndType('after')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label htmlFor="after" className="text-sm">Stop after</Label>
                  {endType === 'after' && (
                    <Select value={endAfter.toString()} onValueChange={(value) => setEndAfter(Number(value))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 10, 15, 20].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {endType === 'after' && <span className="text-sm text-gray-500">emails</span>}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Schedule Preview</span>
          </div>
          <p className="text-sm text-blue-700">{getSchedulePreview()}</p>
        </div>

        {/* Schedule Button */}
        <Button 
          onClick={handleSchedule}
          disabled={disabled || (recurrenceType === 'weekly' && selectedDays.length === 0)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Timer className="h-4 w-4 mr-2" />
          {isRecurring ? 'Schedule Recurring Emails' : 'Schedule Single Email'}
        </Button>

        {/* Warning for weekly with no days */}
        {recurrenceType === 'weekly' && selectedDays.length === 0 && (
          <p className="text-sm text-red-600 text-center">
            Please select at least one day of the week
          </p>
        )}
      </div>
    </Card>
  )
}