"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ClockIcon, CheckCircle2Icon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchedulePickerProps {
  value?: Date;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  timezone?: string;
  className?: string;
}

const PRESET_OPTIONS = [
  { label: "In 1 hour", getValue: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: "In 3 hours", getValue: () => new Date(Date.now() + 3 * 60 * 60 * 1000) },
  { label: "Tomorrow 9 AM", getValue: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }},
  { label: "Next Monday 9 AM", getValue: () => {
    const next = new Date();
    const daysUntilMonday = (1 + 7 - next.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysUntilMonday);
    next.setHours(9, 0, 0, 0);
    return next;
  }},
  { label: "Next Week", getValue: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export function SchedulePicker({ 
  value, 
  onChange, 
  minDate = new Date(), 
  timezone = "UTC",
  className 
}: SchedulePickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  // Removed complex timezone handling - using local time for simplicity
  const [isCustomDateTime, setIsCustomDateTime] = useState(false);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date.toISOString().split('T')[0]);
      setSelectedTime(date.toTimeString().split(' ')[0].substring(0, 5));
      setIsCustomDateTime(true);
    } else {
      // Only set default date, not time - let user choose time
      if (!selectedDate) {
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
      // Don't auto-set time - let it stay empty until user selects
    }
  }, [value]);

  const handlePresetSelect = (preset: typeof PRESET_OPTIONS[0]) => {
    const date = preset.getValue();
    setSelectedDate(date.toISOString().split('T')[0]);
    setSelectedTime(date.toTimeString().split(' ')[0].substring(0, 5));
    setIsCustomDateTime(false);
    onChange(date);
  };

  const handleCustomDateTimeChange = () => {
    if (!selectedDate || !selectedTime) {
      console.log('🕐 SchedulePicker: Not triggering change - missing date or time:', { selectedDate, selectedTime });
      return;
    }
    
    try {
      // Create date in local timezone
      const dateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      
      // Check if the date is valid
      if (isNaN(dateTime.getTime())) {
        console.warn('Invalid date created:', `${selectedDate}T${selectedTime}:00`);
        return;
      }
      
      // Validate minimum date (allow times up to 5 minutes in the past to account for delays)
      const now = new Date();
      const timeDiff = dateTime.getTime() - now.getTime();
      if (timeDiff < -300000) { // Allow up to 5 minutes in the past
        console.log('🕐 Selected time is too far in the past:', {
          selectedDateTime: dateTime.toISOString(),
          currentTime: now.toISOString(),
          timeDiffMinutes: Math.round(timeDiff / 60000)
        });
        return;
      }
      
      console.log('🕐 SchedulePicker: Created datetime:', dateTime.toISOString(), 'from input:', `${selectedDate}T${selectedTime}:00`);
      
      setIsCustomDateTime(true);
      console.log('🕐 SchedulePicker: Calling onChange with:', dateTime);
      onChange(dateTime);
    } catch (error) {
      console.error('Error creating datetime:', error);
    }
  };

  const handleClear = () => {
    setSelectedDate("");
    setSelectedTime("");
    setIsCustomDateTime(false);
    onChange(null);
  };

  const handleResetTime = () => {
    setSelectedTime("");
    setIsCustomDateTime(false);
    onChange(null); // Clear the selected time completely
  };

  const getAMPM = (time: string) => {
    if (!time) return '';  // Return empty for placeholder
    const hour = parseInt(time.split(':')[0]) || 0;
    return hour >= 12 ? 'PM' : 'AM';
  };

  const get12Hour = (time: string) => {
    if (!time) return '';  // Return empty for placeholder
    const hour = parseInt(time.split(':')[0]) || 0;
    if (hour === 0) return '12';
    if (hour > 12) return (hour - 12).toString();
    return hour.toString();
  };

  // Debug function to check current state
  const logCurrentState = () => {
    console.log('🕐 Current SchedulePicker state:', {
      selectedTime,
      selectedDate,
      hour12: get12Hour(selectedTime),
      minute: selectedTime.split(':')[1] || '00',
      ampm: getAMPM(selectedTime),
      value: value
    });
  };

  const formatSelectedDateTime = () => {
    if (!value) return null;
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    return value.toLocaleString('en-US', options);
  };

  return (
    <Card className={cn("p-4 space-y-4 border-0 shadow-apple-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-sm">Schedule Email</h3>
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Options
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_OPTIONS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePresetSelect(preset)}
              className="justify-start text-xs h-8 border-0 bg-secondary/20 hover:bg-secondary/40"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Date & Time */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Custom Schedule
        </Label>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="date" className="text-xs">Date</Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (selectedTime) handleCustomDateTimeChange();
                }}
                min={minDate.toISOString().split('T')[0]}
                className="h-8 text-xs pr-8 border-0 bg-input"
              />
              <CalendarIcon className="absolute right-2 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="time" className="text-xs">Time</Label>
              {selectedTime && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetTime}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Select
                value={get12Hour(selectedTime)}
                onValueChange={(hour) => {
                  console.log('🕐 Hour changed to:', hour);
                  const minute = selectedTime.split(':')[1] || '00';
                  const currentAMPM = getAMPM(selectedTime) || 'PM'; // Default to PM to avoid past times
                  let hour24 = parseInt(hour);
                  
                  // Convert 12-hour to 24-hour format
                  if (currentAMPM === 'AM') {
                    hour24 = hour24 === 12 ? 0 : hour24;
                  } else {
                    hour24 = hour24 === 12 ? 12 : hour24 + 12;
                  }
                  
                  const newTime = `${hour24.toString().padStart(2, '0')}:${minute}`;
                  console.log('🕐 New time after hour change:', newTime, `(${hour} ${currentAMPM} = ${hour24}:${minute})`);
                  setSelectedTime(newTime);
                  
                  // Trigger change if we have both date and a valid minute
                  if (selectedDate) {
                    setTimeout(() => handleCustomDateTimeChange(), 50);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs border-0 bg-input">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => (
                    <SelectItem key={hour} value={hour.toString()} className="text-xs">
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={selectedTime.split(':')[1] || ''}
                onValueChange={(minute) => {
                  console.log('🕐 Minute changed to:', minute);
                  const hourStr = selectedTime.split(':')[0];
                  if (!hourStr) {
                    console.log('🕐 No hour selected yet, setting default hour to 12 AM');
                    // If no hour selected, default to 12 AM
                    const newTime = `00:${minute}`;
                    setSelectedTime(newTime);
                    if (selectedDate) {
                      setTimeout(() => handleCustomDateTimeChange(), 50);
                    }
                    return;
                  }
                  const newTime = `${hourStr.padStart(2, '0')}:${minute}`;
                  console.log('🕐 New time after minute change:', newTime);
                  setSelectedTime(newTime);
                  if (selectedDate) {
                    setTimeout(() => handleCustomDateTimeChange(), 50);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs border-0 bg-input">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const minute = i * 5; // 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
                    return (
                      <SelectItem key={minute} value={minute.toString().padStart(2, '0')} className="text-xs">
                        {minute.toString().padStart(2, '0')}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              <Select
                value={getAMPM(selectedTime) || 'PM'}
                onValueChange={(ampm) => {
                  console.log('🕐 AM/PM changed to:', ampm);
                  const [hourStr, minute] = selectedTime.split(':');
                  let currentHour24 = parseInt(hourStr) || 0;
                  const currentMinute = minute || '00';
                  
                  // Convert current 24-hour to 12-hour, then apply new AM/PM
                  let hour12 = currentHour24 === 0 ? 12 : currentHour24 > 12 ? currentHour24 - 12 : currentHour24;
                  
                  let newHour24;
                  if (ampm === 'AM') {
                    newHour24 = hour12 === 12 ? 0 : hour12;
                  } else {
                    newHour24 = hour12 === 12 ? 12 : hour12 + 12;
                  }
                  
                  const newTime = `${newHour24.toString().padStart(2, '0')}:${currentMinute}`;
                  console.log('🕐 New time after AM/PM change:', newTime);
                  setSelectedTime(newTime);
                  if (selectedDate) {
                    setTimeout(() => handleCustomDateTimeChange(), 50);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs border-0 bg-input">
                  <SelectValue placeholder="AM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM" className="text-xs">AM</SelectItem>
                  <SelectItem value="PM" className="text-xs">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Quick preset undo button */}
        {value && !isCustomDateTime && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-xs text-amber-700">Quick option selected</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-6 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Change Time
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground p-2 bg-secondary/20 rounded">
          💡 Time will be scheduled in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
        </div>
      </div>

      {/* Selected DateTime Display - Only show when user has selected both date and time */}
      {value && selectedDate && selectedTime && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Scheduled for:</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatSelectedDateTime()}
          </p>
        </div>
      )}

      {/* Business Hours Warning */}
      {value && (
        <div className="text-xs text-muted-foreground">
          <p>💡 Emails perform best when sent during business hours (9 AM - 5 PM) in the recipient&apos;s timezone.</p>
        </div>
      )}
    </Card>
  );
}