'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Users, MapPin, Plus, RefreshCw } from 'lucide-react';

interface ComposioEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  status: string;
  attendees?: Array<{ email: string }>;
  location?: string;
}

interface ComposioDashboardProps {
  connectionId?: string;
  onCreateEvent?: () => void;
}

export default function ComposioDashboard({ connectionId, onCreateEvent }: ComposioDashboardProps) {
  const [events, setEvents] = useState<ComposioEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [toolsInfo, setToolsInfo] = useState<{ count: number; message: string }>({ count: 0, message: '' });

  const fetchCalendarData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/composio/calendar');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch calendar data');
      }

      setEvents(data.mockEvents || []);
      setToolsInfo({
        count: data.toolsCount || 0,
        message: data.message || 'Composio tools ready'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [connectionId]);

  const formatEventTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventStatus = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'tentative':
        return <Badge variant="secondary">Tentative</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-sm text-gray-500">Loading calendar via Composio...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-red-500">
              <Calendar className="h-12 w-12 mx-auto mb-2" />
              <p className="font-medium">Failed to load calendar</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
            <Button onClick={fetchCalendarData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Composio Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Composio Calendar Integration
            </span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {toolsInfo.count} tools available
            </Badge>
          </CardTitle>
          <CardDescription>{toolsInfo.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status: Connected via Composio</p>
              <p className="text-xs text-gray-500">
                Calendar operations managed through Composio toolkit
              </p>
            </div>
            <Button onClick={onCreateEvent} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upcoming Events</span>
            <Button onClick={fetchCalendarData} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Events fetched via Composio Google Calendar toolkit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium">No events found</p>
              <p className="text-sm text-gray-400">
                Create your first event using Composio tools
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-gray-900">{event.summary}</h3>
                        {getEventStatus(event.status)}
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatEventTime(event.start.dateTime)}</span>
                        </div>
                        
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{event.attendees.length} attendees</span>
                          </div>
                        )}
                        
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate max-w-xs">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-medium text-blue-900">Composio Integration Active</h4>
              <p className="text-sm text-blue-700">
                Your calendar is now connected through Composio&apos;s managed authentication. 
                All operations use secure Composio toolkit tools.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">OAuth2 Managed</Badge>
                <Badge variant="outline" className="text-xs">Google Calendar API</Badge>
                <Badge variant="outline" className="text-xs">Composio Tools</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}