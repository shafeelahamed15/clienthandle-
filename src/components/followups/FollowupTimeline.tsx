'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TimelineItem {
  id: string;
  kind: 'past' | 'future';
  angle?: string;
  tone?: string;
  subject?: string;
  body?: string;
  at: string;
  status?: string;
  clientId?: string;
  client_name?: string;
}

interface FollowupTimelineProps {
  items: TimelineItem[];
  onPause?: (itemId: string, clientId?: string) => void;
  onCancel?: (itemId: string) => void;
  onReschedule?: (itemId: string) => void;
  onEdit?: (itemId: string) => void;
  onItemClick?: (item: TimelineItem) => void;
}

export function FollowupTimeline({ items, onPause, onCancel, onReschedule, onEdit, onItemClick }: FollowupTimelineProps) {
  console.log('📋 FollowupTimeline received items:', items, 'onItemClick:', !!onItemClick);
  
  if (!items?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-sm">No follow-ups yet.</div>
        <div className="text-xs mt-2">Create a follow-up to see it here</div>
      </div>
    );
  }

  const isDraftClickable = (item: TimelineItem) => {
    const clickable = item.kind === 'future' && ['draft', 'queued', 'scheduled', 'paused'].includes(item.status || '');
    console.log(`🎯 Item ${item.id} clickable:`, clickable, { kind: item.kind, status: item.status });
    return clickable;
  };

  console.log('📋 FollowupTimeline rendering with items:', items);

  return (
    <div className="space-y-4">
      {items.map(it => (
        <div 
          key={`${it.kind}-${it.id}`} 
          className={`group relative rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/30 transition-all duration-300 ${
            isDraftClickable(it) 
              ? 'hover:shadow-xl hover:border-blue-200 cursor-pointer transform hover:scale-[1.02] hover:bg-gradient-to-br hover:from-blue-50/30 hover:to-indigo-50/20' 
              : 'hover:shadow-lg hover:border-gray-200'
          }`}
          onClick={() => isDraftClickable(it) && onItemClick?.(it)}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge 
                    className={`px-3 py-1.5 text-xs font-semibold shadow-sm ${
                      it.kind === 'past' 
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' 
                        : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200'
                    }`}
                  >
                    {it.kind === 'past' ? '✓ Sent' : '⏰ Scheduled'}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      it.kind === 'past' ? 'bg-green-400' : 'bg-blue-400'
                    }`}></div>
                    <div className="text-sm text-gray-600 font-medium">
                      {new Date(it.at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                  {isDraftClickable(it) && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 text-xs font-medium shadow-sm animate-pulse">
                      ✏️ Click to edit
                    </Badge>
                  )}
                </div>
              
                <div className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-blue-900 transition-colors duration-200">
                  {it.subject || (it.angle ? `[${it.angle.replace('_', ' ')}]` : 'Follow-up')}
                </div>
              
                {/* Show message preview */}
                {it.body && (
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 rounded-xl border border-gray-100 mb-4 group-hover:border-blue-200 transition-all duration-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {it.body.length > 150 ? it.body.substring(0, 150) + '...' : it.body}
                    </p>
                  </div>
                )}

                {/* Client info */}
                {it.client_name && (
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-700">
                        {it.client_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{it.client_name}</p>
                      <p className="text-xs text-gray-500">Client</p>
                    </div>
                  </div>
                )}
              
                <div className="flex items-center gap-4 text-xs">
                  {it.tone && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-gray-600 font-medium">Tone: <span className="text-purple-700 capitalize">{it.tone}</span></span>
                    </div>
                  )}
                  {it.status && (
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        it.status === 'sent' ? 'bg-green-400' :
                        it.status === 'queued' ? 'bg-blue-400' :
                        it.status === 'draft' ? 'bg-gray-400' :
                        it.status === 'paused' ? 'bg-amber-400' :
                        'bg-gray-300'
                      }`}></div>
                      <span className="text-gray-600 font-medium">Status: <span className={`capitalize ${
                        it.status === 'sent' ? 'text-green-700' :
                        it.status === 'queued' ? 'text-blue-700' :
                        it.status === 'draft' ? 'text-gray-700' :
                        it.status === 'paused' ? 'text-amber-700' :
                        'text-gray-600'
                      }`}>{it.status}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {it.kind === 'future' && it.status !== 'cancelled' && (
                <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0" onClick={(e) => e.stopPropagation()}>
                  {onPause && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`text-xs px-3 py-2 font-medium shadow-sm hover:shadow-md transition-all duration-200 ${
                        ['paused', 'draft'].includes(it.status || '') 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 hover:from-green-100 hover:to-emerald-100'
                          : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200 hover:from-amber-100 hover:to-orange-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPause(it.id, it.clientId);
                      }}
                    >
                      {['paused', 'draft'].includes(it.status || '') ? '▶️ Resume' : '⏸️ Pause'}
                    </Button>
                  )}
                  {onReschedule && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs px-3 py-2 font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 hover:from-blue-100 hover:to-indigo-100 shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReschedule(it.id);
                      }}
                    >
                      📅 Reschedule
                    </Button>
                  )}
                  {onEdit && it.kind === 'future' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs px-3 py-2 font-medium bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-purple-200 hover:from-purple-100 hover:to-indigo-100 shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(it.id);
                      }}
                    >
                      ✏️ Edit
                    </Button>
                  )}
                  {onCancel && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs px-3 py-2 font-medium bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border-red-200 hover:from-red-100 hover:to-pink-100 shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel(it.id);
                      }}
                    >
                      🗑️ Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}