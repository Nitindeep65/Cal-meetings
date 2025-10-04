'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Video, Calendar, Brain, Lightbulb, TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CalendarEvent, CalendarStats } from '@/lib/google-calendar-service'
import { useSession, signIn } from 'next-auth/react'

// Interface for processed meetings to display
interface ProcessedMeeting {
  id: string
  title: string
  time: string
  duration: string
  type: 'video' | 'in-person' | 'unknown'
  attendees: number
  date: Date
  summary?: {
    summary: string
    keyPoints: string[]
    actionItems: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
  }
  aiInsights?: {
    preparation?: string[]
    suggestedAgenda?: string[]
  }
}

export function CalendarDashboard() {
  const { status } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [meetings, setMeetings] = useState<ProcessedMeeting[]>([])
  const [stats, setStats] = useState<CalendarStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsCalendarAuth, setNeedsCalendarAuth] = useState(false)
  const [generatingAI, setGeneratingAI] = useState<string | null>(null)

  // AI Handler Functions
  const generateMeetingSummary = async (meeting: ProcessedMeeting) => {
    setGeneratingAI(meeting.id)
    try {
      const response = await fetch('/api/calendar/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: meeting.id,
          eventTitle: meeting.title,
          eventDescription: `Meeting duration: ${meeting.duration}`,
          attendees: Array(meeting.attendees).fill('Attendee')
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Update the meeting with the generated summary
        setMeetings(prev => prev.map(m => 
          m.id === meeting.id 
            ? { ...m, summary: data.summary }
            : m
        ))
      }
    } catch (error) {
      console.error('Failed to generate summary:', error)
    } finally {
      setGeneratingAI(null)
    }
  }

  const generateMeetingInsights = async (meeting: ProcessedMeeting) => {
    setGeneratingAI(meeting.id)
    try {
      const response = await fetch('/api/calendar/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: meeting.title,
          eventDescription: `Meeting duration: ${meeting.duration}`,
          attendees: Array(meeting.attendees).fill('Attendee'),
          isUpcoming: true
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Update the meeting with the generated insights
        setMeetings(prev => prev.map(m => 
          m.id === meeting.id 
            ? { ...m, aiInsights: data.insights }
            : m
        ))
      }
    } catch (error) {
      console.error('Failed to generate insights:', error)
    } finally {
      setGeneratingAI(null)
    }
  }

  // Fetch calendar data
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get events for current month
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        
        // Fetch events from API
        const eventsResponse = await fetch(
          `/api/calendar/events?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`
        )
        
        if (!eventsResponse.ok) {
          throw new Error('Failed to fetch calendar events')
        }
        
        const eventsData = await eventsResponse.json()
        
        if (!eventsData.success) {
          throw new Error(eventsData.error || 'Failed to fetch calendar events')
        }

        // Convert events to ProcessedMeeting format
        const processedMeetings: ProcessedMeeting[] = eventsData.events.map((event: CalendarEvent) => ({
          id: event.id,
          title: event.title,
          time: format(new Date(event.start), 'h:mm a'),
          duration: calculateDuration(event.start, event.end),
          type: event.location?.toLowerCase().includes('virtual') || event.location?.toLowerCase().includes('zoom') ? 'video' : 
                event.location ? 'in-person' : 'unknown',
          attendees: event.attendees?.length || 0,
          date: new Date(event.start),
          // Remove AI-related properties since we're not using them anymore
          summary: undefined,
          aiInsights: undefined,
        }))

        setMeetings(processedMeetings)

        // Get calendar stats from API
        const statsResponse = await fetch(
          `/api/calendar/stats?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`
        )
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (statsData.success) {
            setStats(statsData.stats)
          }
        }
      } catch (err) {
        console.error('Failed to fetch calendar data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar data'
        
        // Check if it's an authorization error
        if (errorMessage.includes('No connected account') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
          setNeedsCalendarAuth(true)
          setError('Calendar authorization required')
        } else {
          setError(errorMessage)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCalendarData()
  }, [currentDate])

  // Helper function to calculate duration
  const calculateDuration = (start: string, end: string): string => {
    const startTime = new Date(start)
    const endTime = new Date(end)
    const durationMs = endTime.getTime() - startTime.getTime()
    const minutes = Math.round(durationMs / (1000 * 60))
    
    if (minutes < 60) {
      return `${minutes} min`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (remainingMinutes === 0) {
      return `${hours}h`
    }
    
    return `${hours}h ${remainingMinutes}m`
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const dateFormat = "d"
  const rows = []

  let days = []
  let day = startDate
  let formattedDate = ""

  // Build calendar grid
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat)
      const cloneDay = day
      const dayMeetings = meetings.filter(meeting => isSameDay(meeting.date, day))
      
      days.push(
        <div
          key={day.toString()}
          className={`min-h-[100px] p-2 border border-border cursor-pointer hover:bg-muted/50 transition-colors ${
            !isSameMonth(day, monthStart)
              ? "text-muted-foreground bg-muted/20"
              : isSameDay(day, selectedDate)
              ? "bg-primary text-primary-foreground"
              : isSameDay(day, new Date())
              ? "bg-accent"
              : "bg-background"
          }`}
          onClick={() => setSelectedDate(cloneDay)}
        >
          <div className="flex flex-col h-full">
            <span className="text-sm font-medium mb-1">{formattedDate}</span>
            <div className="flex-1 space-y-1">
              {dayMeetings.slice(0, 2).map((meeting) => (
                <div
                  key={meeting.id}
                  className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 truncate"
                >
                  {meeting.time} {meeting.title}
                </div>
              ))}
              {dayMeetings.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{dayMeetings.length - 2} more
                </div>
              )}
            </div>
          </div>
        </div>
      )
      day = addDays(day, 1)
    }
    rows.push(
      <div key={day.toString()} className="grid grid-cols-7">
        {days}
      </div>
    )
    days = []
  }

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const selectedDateMeetings = meetings.filter(meeting => 
    isSameDay(meeting.date, selectedDate)
  )

  // Handle authentication states
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Calendar className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="p-6 text-center">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Please sign in with Google to access your calendar dashboard.
            </p>
            <Button 
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full"
            >
              Sign in with Google Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Calendar className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (needsCalendarAuth) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="p-6 text-center">
          <CardHeader>
            <CardTitle>Calendar Access Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Please sign in with Google to access your calendar data.
            </p>
            <Button 
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full"
            >
              Sign in with Google Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !needsCalendarAuth) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive mb-2">Failed to load calendar</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col lg:flex-row gap-6 flex-1">
      {/* Calendar */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-2xl font-bold">
              {format(currentDate, "MMMM yyyy")}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Meeting
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Days of week header */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="space-y-0">
              {rows}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar with meeting details */}
      <div className="w-full lg:w-80 space-y-4">
        {/* Selected date meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, "EEEE, MMMM d")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateMeetings.length > 0 ? (
              <div className="space-y-3">
                {selectedDateMeetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      {meeting.type === 'video' ? (
                        <Video className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Users className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{meeting.title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {meeting.time} • {meeting.duration}
                        </span>
                      </div>
                      <div className="flex items-center mt-2">
                        <Users className="h-3 w-3 text-muted-foreground mr-1" />
                        <span className="text-xs text-muted-foreground">
                          {meeting.attendees} attendees
                        </span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {meeting.type}
                        </Badge>
                      </div>

                      {/* AI Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        {meeting.date < new Date() ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => generateMeetingSummary(meeting)}
                            disabled={generatingAI === meeting.id}
                          >
                            <Brain className="h-3 w-3 mr-1" />
                            {generatingAI === meeting.id ? 'Generating...' : 'Generate Summary'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => generateMeetingInsights(meeting)}
                            disabled={generatingAI === meeting.id}
                          >
                            <Lightbulb className="h-3 w-3 mr-1" />
                            {generatingAI === meeting.id ? 'Generating...' : 'Get Insights'}
                          </Button>
                        )}
                      </div>
                      
                      {/* AI Insights for upcoming meetings */}
                      {meeting.aiInsights && (
                        <div className="mt-3 pt-2 border-t space-y-2">
                          <div className="flex items-center gap-1">
                            <Brain className="h-3 w-3 text-blue-500" />
                            <span className="text-xs font-medium text-blue-600">AI Suggestions</span>
                          </div>
                          {meeting.aiInsights.preparation && meeting.aiInsights.preparation.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Preparation:</p>
                              {meeting.aiInsights.preparation.slice(0, 2).map((item, index) => (
                                <div key={index} className="flex items-start gap-1">
                                  <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                  <span className="text-xs text-muted-foreground">{item}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Meeting Summary for past meetings */}
                      {meeting.summary && (
                        <div className="mt-3 pt-2 border-t space-y-2">
                          <div className="flex items-center gap-1">
                            <Brain className="h-3 w-3 text-green-500" />
                            <span className="text-xs font-medium text-green-600">AI Summary</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{meeting.summary.summary}</p>
                          {meeting.summary.actionItems.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Action Items:</p>
                              {meeting.summary.actionItems.slice(0, 2).map((item, index) => (
                                <div key={index} className="flex items-start gap-1">
                                  <div className="w-1 h-1 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                                  <span className="text-xs text-muted-foreground">{item}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No meetings scheduled</p>
                <Button size="sm" className="mt-2">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Meeting
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Meetings</span>
                <span className="text-2xl font-bold">{stats?.totalMeetings || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Hours Scheduled</span>
                <span className="text-2xl font-bold">{stats?.totalHours || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Upcoming</span>
                <span className="text-2xl font-bold">{stats?.upcomingMeetings || 0}</span>
              </div>
              {stats?.productivityScore && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Productivity Score</span>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold">{stats.productivityScore}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        {stats?.trends && stats.trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.trends.slice(0, 2).map((trend, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{trend}</span>
                  </div>
                ))}
                {stats.recommendations && stats.recommendations.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations:</p>
                    {stats.recommendations.slice(0, 1).map((rec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next Up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {meetings.slice(0, 3).filter(meeting => new Date(meeting.date) >= new Date()).map((meeting) => (
                <div key={meeting.id} className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-medium">{meeting.time}</span>
                  <span className="text-muted-foreground truncate">{meeting.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  )
}