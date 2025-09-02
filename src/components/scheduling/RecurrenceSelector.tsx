"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RepeatIcon, CalendarIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days?: string[];
  until?: string;
}

interface RecurrenceSelectorProps {
  value?: RecurrencePattern;
  onChange: (pattern: RecurrencePattern | null) => void;
  className?: string;
}

const WEEKDAYS = [
  { value: 'monday', label: 'Mon', fullLabel: 'Monday' },
  { value: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
  { value: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
  { value: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
  { value: 'friday', label: 'Fri', fullLabel: 'Friday' },
  { value: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
  { value: 'sunday', label: 'Sun', fullLabel: 'Sunday' },
];

const PRESET_PATTERNS = [
  {
    label: "Daily (weekdays only)",
    pattern: { type: 'daily' as const, interval: 1, days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }
  },
  {
    label: "Weekly",
    pattern: { type: 'weekly' as const, interval: 1 }
  },
  {
    label: "Bi-weekly",
    pattern: { type: 'weekly' as const, interval: 2 }
  },
  {
    label: "Monthly",
    pattern: { type: 'monthly' as const, interval: 1 }
  }
];

export function RecurrenceSelector({ value, onChange, className }: RecurrenceSelectorProps) {
  const [isEnabled, setIsEnabled] = useState<boolean>(!!value);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [interval, setInterval] = useState<number>(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    if (value) {
      setIsEnabled(true);
      setRecurrenceType(value.type);
      setInterval(value.interval);
      setSelectedDays(value.days || []);
      setEndDate(value.until || "");
    }
  }, [value]);

  const handleEnabledChange = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      onChange(null);
    } else {
      updatePattern();
    }
  };

  const updatePattern = () => {
    if (!isEnabled) return;

    const pattern: RecurrencePattern = {
      type: recurrenceType,
      interval,
      ...(selectedDays.length > 0 && { days: selectedDays }),
      ...(endDate && { until: endDate })
    };

    onChange(pattern);
  };

  const handlePresetSelect = (preset: typeof PRESET_PATTERNS[0]) => {
    setRecurrenceType(preset.pattern.type);
    setInterval(preset.pattern.interval);
    setSelectedDays(preset.pattern.days || []);
    setIsEnabled(true);
    
    const pattern = { ...preset.pattern };
    if (endDate) pattern.until = endDate;
    onChange(pattern);
  };

  const toggleDay = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    
    setSelectedDays(newDays);
    
    if (isEnabled) {
      const pattern: RecurrencePattern = {
        type: recurrenceType,
        interval,
        ...(newDays.length > 0 && { days: newDays }),
        ...(endDate && { until: endDate })
      };
      onChange(pattern);
    }
  };

  const formatRecurrenceDescription = () => {
    if (!value) return null;

    let description = "";
    
    if (value.type === 'daily') {
      if (value.interval === 1) {
        description = value.days ? 
          `Daily on ${value.days.map(d => WEEKDAYS.find(wd => wd.value === d)?.label).join(', ')}` :
          "Every day";
      } else {
        description = `Every ${value.interval} days`;
      }
    } else if (value.type === 'weekly') {
      if (value.interval === 1) {
        description = value.days ?
          `Weekly on ${value.days.map(d => WEEKDAYS.find(wd => wd.value === d)?.label).join(', ')}` :
          "Every week";
      } else {
        description = `Every ${value.interval} weeks`;
      }
    } else if (value.type === 'monthly') {
      description = value.interval === 1 ? "Every month" : `Every ${value.interval} months`;
    }

    if (value.until) {
      const endDate = new Date(value.until);
      description += ` until ${endDate.toLocaleDateString()}`;
    }

    return description;
  };

  return (
    <Card className={cn("p-4 space-y-4 border-0 shadow-apple-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RepeatIcon className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-sm">Recurring Schedule</h3>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleEnabledChange}
        />
      </div>

      {isEnabled && (
        <>
          {/* Preset Patterns */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quick Patterns
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_PATTERNS.map((preset) => (
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

          {/* Custom Pattern */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Custom Pattern
            </Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Repeat every</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={interval}
                    onChange={(e) => {
                      const newInterval = parseInt(e.target.value) || 1;
                      setInterval(newInterval);
                      updatePattern();
                    }}
                    min={1}
                    max={365}
                    className="h-8 text-xs border-0 bg-input w-16"
                  />
                  <Select 
                    value={recurrenceType} 
                    onValueChange={(type: 'daily' | 'weekly' | 'monthly') => {
                      setRecurrenceType(type);
                      updatePattern();
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs border-0 bg-input flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">day(s)</SelectItem>
                      <SelectItem value="weekly">week(s)</SelectItem>
                      <SelectItem value="monthly">month(s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">End date (optional)</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      updatePattern();
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="h-8 text-xs pr-8 border-0 bg-input"
                  />
                  <CalendarIcon className="absolute right-2 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Days Selection for Weekly/Daily */}
            {(recurrenceType === 'weekly' || recurrenceType === 'daily') && (
              <div>
                <Label className="text-xs">Days of the week</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {WEEKDAYS.map((day) => (
                    <Button
                      key={day.value}
                      variant={selectedDays.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "h-7 px-2 text-xs border-0",
                        selectedDays.includes(day.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/20 hover:bg-secondary/40"
                      )}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pattern Summary */}
          {value && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <RepeatIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Recurring Pattern:</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatRecurrenceDescription()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEnabledChange(false)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Helpful Tips */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Tip:</strong> Recurring emails will automatically pause if a client replies to any email in the sequence.</p>
            <p>⚠️ <strong>Note:</strong> Be mindful of frequency to avoid being marked as spam. Weekly or bi-weekly is recommended for most follow-ups.</p>
          </div>
        </>
      )}
    </Card>
  );
}