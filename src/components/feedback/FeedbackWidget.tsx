'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Star, Send, Lightbulb, Bug, Heart } from 'lucide-react';

interface FeedbackWidgetProps {
  trigger?: React.ReactNode;
  className?: string;
  placement?: 'bottom-right' | 'bottom-left' | 'inline';
}

export function FeedbackWidget({ 
  trigger, 
  className = '',
  placement = 'bottom-right' 
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    rating: '',
    message: '',
    email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          page: window.location.pathname,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setIsOpen(false);
          setSubmitted(false);
          setFormData({ type: '', rating: '', message: '', email: '' });
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStars = (rating: string) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 cursor-pointer transition-colors ${
          i < parseInt(rating) 
            ? 'text-yellow-500 fill-yellow-500' 
            : 'text-gray-300 hover:text-yellow-400'
        }`}
        onClick={() => handleChange('rating', (i + 1).toString())}
      />
    ));
  };

  // Default floating trigger
  const defaultTrigger = (
    <Button
      onClick={() => setIsOpen(true)}
      className={`
        ${placement === 'bottom-right' ? 'fixed bottom-6 right-6 z-50' : ''}
        ${placement === 'bottom-left' ? 'fixed bottom-6 left-6 z-50' : ''}
        rounded-full h-12 w-12 shadow-apple-lg bg-gradient-to-r from-blue-600 to-purple-600 
        hover:from-blue-700 hover:to-purple-700 animate-apple-hover
      `}
    >
      <MessageSquare className="h-5 w-5" />
      <span className="sr-only">Send Feedback</span>
    </Button>
  );

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className={className}>
          {trigger}
        </div>
      ) : (
        defaultTrigger
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-apple-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Share Your Feedback
            </DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              Help us improve ClientHandle with your thoughts and suggestions.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Thank you for your feedback!
              </h3>
              <p className="text-sm text-gray-600">
                Your input helps us build a better ClientHandle experience.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">What type of feedback is this?</Label>
                <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                  <SelectTrigger className="h-10 bg-input border-0 focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Select feedback type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Feature Request
                      </div>
                    </SelectItem>
                    <SelectItem value="bug">
                      <div className="flex items-center gap-2">
                        <Bug className="h-4 w-4" />
                        Bug Report
                      </div>
                    </SelectItem>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        General Feedback
                      </div>
                    </SelectItem>
                    <SelectItem value="praise">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Praise
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">How would you rate your experience?</Label>
                <div className="flex items-center gap-1">
                  {renderStars(formData.rating)}
                  {formData.rating && (
                    <Badge variant="outline" className="ml-2">
                      {formData.rating}/5
                    </Badge>
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Your feedback *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="Tell us what you think, what features you'd like to see, or any issues you've encountered..."
                  rows={4}
                  className="bg-input border-0 focus:ring-2 focus:ring-primary/20 resize-none"
                  required
                />
              </div>

              {/* Optional Email */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email (optional)</Label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="your@email.com - if you'd like us to follow up"
                  className="w-full h-10 px-3 py-2 bg-input border-0 rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <p className="text-xs text-gray-500">
                  We&apos;ll only use this to follow up on your feedback if needed.
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 animate-apple-press"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.message.trim()}
                  className="flex-1 animate-apple-press shadow-apple-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}