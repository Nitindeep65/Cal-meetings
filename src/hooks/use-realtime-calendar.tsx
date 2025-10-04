'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Interface for calendar events from Composio
interface ComposioEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  location?: string;
  description?: string;
  status?: string;
}

// Interface for calendar information
interface CalendarInfo {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
}

// Interface for user information
interface UserInfo {
  email: string;
  name?: string;
  picture?: string;
  id?: string;
}

// Interface for calendar stats
interface CalendarStats {
  totalEvents: number;
  upcomingEvents: number;
  todayEvents: number;
  thisWeekEvents: number;
  busyHours: number;
  averageDuration: number;
}

interface UseRealTimeCalendarResult {
  events: ComposioEvent[];
  calendars: CalendarInfo[];
  userInfo: UserInfo | null;
  stats: CalendarStats;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  isRealTime: boolean;
}

export function useRealTimeCalendar(
  userId?: string,
  options?: {
    autoRefreshInterval?: number; // in milliseconds
    timeMin?: string;
    timeMax?: string;
    enableAutoRefresh?: boolean;
  }
): UseRealTimeCalendarResult {
  const [events, setEvents] = useState<ComposioEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<CalendarStats>({
    totalEvents: 0,
    upcomingEvents: 0,
    todayEvents: 0,
    thisWeekEvents: 0,
    busyHours: 0,
    averageDuration: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRealTime, setIsRealTime] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshInterval = options?.autoRefreshInterval || 60000; // Default 1 minute
  const enableAutoRefresh = options?.enableAutoRefresh ?? true;

  const calculateStats = useCallback((eventList: ComposioEvent[]): CalendarStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    let upcomingEvents = 0;
    let todayEvents = 0;
    let thisWeekEvents = 0;
    let totalDuration = 0;
    let busyHours = 0;

    eventList.forEach(event => {
      const startTime = event.start.dateTime ? new Date(event.start.dateTime) : 
                       event.start.date ? new Date(event.start.date) : null;
      const endTime = event.end.dateTime ? new Date(event.end.dateTime) : 
                     event.end.date ? new Date(event.end.date) : null;

      if (startTime) {
        // Upcoming events
        if (startTime > now) {
          upcomingEvents++;
        }

        // Today's events
        if (startTime >= today && startTime < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
          todayEvents++;
        }

        // This week's events
        if (startTime >= startOfWeek && startTime < endOfWeek) {
          thisWeekEvents++;
        }

        // Calculate duration and busy hours
        if (endTime && startTime) {
          const duration = endTime.getTime() - startTime.getTime();
          totalDuration += duration;
          
          if (startTime >= today && startTime < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
            busyHours += duration / (1000 * 60 * 60); // Convert to hours
          }
        }
      }
    });

    return {
      totalEvents: eventList.length,
      upcomingEvents,
      todayEvents,
      thisWeekEvents,
      busyHours: Math.round(busyHours * 10) / 10,
      averageDuration: eventList.length > 0 ? Math.round((totalDuration / eventList.length) / (1000 * 60)) : 0 // Average in minutes
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setEvents([]);
      setCalendars([]);
      setUserInfo(null);
      setStats({
        totalEvents: 0,
        upcomingEvents: 0,
        todayEvents: 0,
        thisWeekEvents: 0,
        busyHours: 0,
        averageDuration: 0
      });
      setIsRealTime(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch events
      const eventsResponse = await fetch('/api/composio/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_events',
          userId,
          params: {
            timeMin: options?.timeMin || new Date().toISOString(),
            timeMax: options?.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });

      // Fetch calendars list
      const calendarsResponse = await fetch('/api/composio/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_primary_calendar',
          userId
        })
      });

      // Fetch user profile
      const userResponse = await fetch('/api/composio/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_profile',
          userId
        })
      });

      const [eventsData, calendarsData, userData] = await Promise.all([
        eventsResponse.json(),
        calendarsResponse.json(),
        userResponse.json()
      ]);

      // Process events
      if (eventsData.success && eventsData.events) {
        setEvents(eventsData.events);
        setStats(calculateStats(eventsData.events));
        setIsRealTime(true);
      } else {
        console.warn('Failed to fetch events:', eventsData.error);
        setEvents([]);
      }

      // Process calendars
      if (calendarsData.success && calendarsData.calendar) {
        setCalendars([calendarsData.calendar]);
      } else {
        console.warn('Failed to fetch calendars:', calendarsData.error);
        setCalendars([]);
      }

      // Process user info
      if (userData.success && userData.profile) {
        setUserInfo({
          email: userData.profile.email || userData.profile.emailAddress,
          name: userData.profile.name || userData.profile.displayName,
          picture: userData.profile.picture || userData.profile.photo,
          id: userData.profile.id
        });
      } else {
        console.warn('Failed to fetch user profile:', userData.error);
      }

      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching real-time calendar data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar data');
      setIsRealTime(false);
    } finally {
      setLoading(false);
    }
  }, [userId, options?.timeMin, options?.timeMax, calculateStats]);

  // Auto-refresh functionality
  useEffect(() => {
    if (enableAutoRefresh && userId && autoRefreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, autoRefreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enableAutoRefresh, userId, autoRefreshInterval, fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    events,
    calendars,
    userInfo,
    stats,
    loading,
    error,
    lastUpdated,
    refreshData: fetchData,
    isRealTime
  };
}