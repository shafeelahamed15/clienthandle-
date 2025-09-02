'use client';
import React from 'react';
import { Button } from '@/components/ui/button';

export function AngleSuggestions({ suggestions, onInsert }: {
  suggestions: { angle: string; subject?: string; body: string }[];
  onInsert: (s: { angle: string; subject?: string; body: string }) => void;
}) {
  if (!suggestions?.length) return null;
  
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {suggestions.map((s, i) => (
        <div key={i} className="rounded-2xl border p-4 shadow-sm bg-white hover:shadow-md transition-shadow">
          <div className="mb-2 text-xs uppercase tracking-wide text-gray-500 font-medium">
            {s.angle.replace('_', ' ')}
          </div>
          {s.subject && (
            <div className="font-medium mb-1 text-gray-900 line-clamp-2">
              {s.subject}
            </div>
          )}
          <p className="text-sm text-gray-700 line-clamp-3 mb-3">
            {s.body}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700" 
            onClick={() => onInsert(s)}
          >
            Insert
          </Button>
        </div>
      ))}
    </div>
  );
}