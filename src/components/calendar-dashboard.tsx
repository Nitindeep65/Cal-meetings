'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, isToday, isFuture, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin, User, RefreshCw, Wifi, WifiOff, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ComposioLoginButton } from './composio-login-button'
import { CalendarSummary } from './calendar-summary'
import { useRealTimeCalendar } from '@/hooks/use-realtime-calendar'

// Interface for processed meetings to display
interface ProcessedMeeting {
  id: string
  title: string
  time: string
  duration: string
  type: 'video' | 'in-person' | 'unknown'
  attendees: number
  date: Date
  location?: string
  description?: string
}

export function CalendarDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showSelectedDateSummary, setShowSelectedDateSummary] = useState(false)
  const [selectedDateSummaryData, setSelectedDateSummaryData] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Get user ID from session storage
  const composioUserId = typeof window !== 'undefined' ? sessionStorage.getItem('composio_user_id') : null
  const composioConnectionId = typeof window !== 'undefined' ? sessionStorage.getItem('composio_connection_id') : null

  // Use the real-time calendar hook with connection ID if available
  const {
    events,
    userInfo,
    stats,
    loading,
    error,
    lastUpdated,
    refreshData,
    isRealTime
  } = useRealTimeCalendar(composioConnectionId || composioUserId || undefined, {
    timeMin: startOfMonth(currentDate).toISOString(),
    timeMax: endOfMonth(currentDate).toISOString(),
    autoRefreshInterval: 60000, // Refresh every minute
    enableAutoRefresh: true
  })

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

  // Convert events to ProcessedMeeting format
  const meetings = useMemo(() => {
    return events.map(event => {
      const startDateTime = event.start?.dateTime || event.start?.date
      const endDateTime = event.end?.dateTime || event.end?.date
      
      if (!startDateTime || !endDateTime) {
        return null
      }

      const startDate = new Date(startDateTime)

      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        time: format(startDate, 'h:mm a'),
        duration: calculateDuration(startDateTime, endDateTime),
        type: event.location?.toLowerCase().includes('meet.google.com') || 
              event.location?.toLowerCase().includes('zoom') || 
              event.location?.toLowerCase().includes('teams') ? 'video' : 
              event.location ? 'in-person' : 'unknown',
        attendees: event.attendees?.length || 0,
        date: startDate,
        location: event.location,
        description: event.description,
      } as ProcessedMeeting
    }).filter(Boolean) as ProcessedMeeting[]
  }, [events])

  // Check authentication status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasConnection = composioUserId && composioConnectionId
      setIsAuthenticated(!!hasConnection)
    }
  }, [composioUserId, composioConnectionId])

  // Get today's meetings
  const todaysMeetings = meetings.filter(meeting => 
    isSameDay(meeting.date, new Date())
  ).sort((a, b) => a.date.getTime() - b.date.getTime())

  // Get upcoming meetings (next 7 days)
  const upcomingMeetings = meetings
    .filter(meeting => isFuture(meeting.date))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5)

  // Get meetings for selected date
  const selectedDateMeetings = meetings.filter(meeting => 
    isSameDay(meeting.date, selectedDate)
  ).sort((a, b) => a.date.getTime() - b.date.getTime())

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="text-center space-y-4">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-2xl font-semibold">Welcome to Your Calendar Dashboard</h2>
            <p className="text-muted-foreground mt-2">
              Connect your Google Calendar via Composio to see your events, statistics, and insights
            </p>
          </div>
        </div>
        <ComposioLoginButton />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading your calendar...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="text-center space-y-4">
          <Calendar className="h-16 w-16 mx-auto text-destructive/50" />
          <div>
            <h2 className="text-2xl font-semibold text-destructive">Connection Error</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
        </div>
        <Button onClick={() => refreshData()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  // Generate calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = []
  let day = startDate

  while (day <= endDate) {
    calendarDays.push(new Date(day))
    day = addDays(day, 1)
  }

  // Get meetings for a specific day
  const getMeetingsForDay = (date: Date) => {
    return meetings.filter(meeting => isSameDay(meeting.date, date))
  }

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    // Reset summary when selecting a new date
    setShowSelectedDateSummary(false)
    setSelectedDateSummaryData(null)
  }

  const handleSummarizeSelectedDate = async () => {
    if (selectedDateMeetings.length === 0) return
    
    setSummaryLoading(true)
    setShowSelectedDateSummary(true)
    
    try {
      // Generate a custom summary for the selected date
      const summary = generateDateSummary(selectedDate, selectedDateMeetings)
      setSelectedDateSummaryData(summary)
      
      // Scroll to AI summary section
      setTimeout(() => {
        const aiSummaryElement = document.querySelector('[data-ai-summary]')
        if (aiSummaryElement) {
          aiSummaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
      
    } catch (error) {
      console.error('Error generating summary:', error)
      setSelectedDateSummaryData('Unable to generate summary at this time.')
    } finally {
      setSummaryLoading(false)
    }
  }

  const generateDateSummary = (date: Date, meetings: ProcessedMeeting[]): string => {
    const totalMeetings = meetings.length
    const totalDuration = meetings.reduce((acc, meeting) => {
      const duration = parseInt(meeting.duration) || 0
      return acc + duration
    }, 0)
    const videoMeetings = meetings.filter(m => m.type === 'video').length
    const inPersonMeetings = meetings.filter(m => m.type === 'in-person').length
    const totalAttendees = meetings.reduce((acc, meeting) => acc + meeting.attendees, 0)
    
    return `📅 **${format(date, 'EEEE, MMMM d, yyyy')} Summary**

🔢 **Overview:**
• ${totalMeetings} meeting${totalMeetings !== 1 ? 's' : ''} scheduled
• ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m total duration
• ${totalAttendees} total attendees across all meetings

📊 **Meeting Breakdown:**
• ${videoMeetings} video meeting${videoMeetings !== 1 ? 's' : ''}
• ${inPersonMeetings} in-person meeting${inPersonMeetings !== 1 ? 's' : ''}
• ${totalMeetings - videoMeetings - inPersonMeetings} other meeting${(totalMeetings - videoMeetings - inPersonMeetings) !== 1 ? 's' : ''}

⏰ **Schedule:**
${meetings.map(meeting => `• ${meeting.time} - ${meeting.title} (${meeting.duration})`).join('\n')}

💡 **Insights:**
• Average meeting duration: ${Math.round(totalDuration / totalMeetings)}min
• Peak collaboration day with ${totalAttendees} people involved
• ${videoMeetings > inPersonMeetings ? 'Primarily virtual' : 'Mix of virtual and in-person'} meetings`
  }

  return (
    <div className="space-y-6">
      {/* Header with Real-time Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              {userInfo?.name || 'Your calendar overview'}
            </p>
            {isRealTime ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="w-4 h-4" />
                <span className="text-xs">Real-time</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-orange-600">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs">Offline</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Updated {format(lastUpdated, 'h:mm a')}
            </p>
          )}
          <Button onClick={() => refreshData()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">
              Future events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageDuration}min</div>
            <p className="text-xs text-muted-foreground">
              Per meeting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Busy Hours</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.busyHours}h</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentDate, 'MMMM yyyy')}</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayMeetings = getMeetingsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentDay = isToday(day)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={`
                      p-2 min-h-[60px] text-left rounded-md transition-colors
                      ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                      ${isCurrentDay && !isSelected ? 'bg-accent text-accent-foreground' : ''}
                      ${!isCurrentMonth ? 'text-muted-foreground opacity-50' : ''}
                      ${isCurrentMonth && !isSelected && !isCurrentDay ? 'hover:bg-accent' : ''}
                    `}
                  >
                    <div className="font-medium text-sm">
                      {format(day, 'd')}
                    </div>
                    {dayMeetings.length > 0 && (
                      <div className="mt-1">
                        {dayMeetings.slice(0, 2).map((meeting) => (
                          <div
                            key={meeting.id}
                            className={`
                              text-xs px-1 py-0.5 rounded mb-1 truncate
                              ${meeting.type === 'video' ? 'bg-blue-100 text-blue-800' : ''}
                              ${meeting.type === 'in-person' ? 'bg-green-100 text-green-800' : ''}
                              ${meeting.type === 'unknown' ? 'bg-gray-100 text-gray-800' : ''}
                            `}
                          >
                            {meeting.title}
                          </div>
                        ))}
                        {dayMeetings.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayMeetings.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today&apos;s Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              {todaysMeetings.length === 0 ? (
                <p className="text-muted-foreground text-sm">No meetings today</p>
              ) : (
                <div className="space-y-3">
                  {todaysMeetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm">{meeting.title}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{meeting.time}</span>
                          <span>•</span>
                          <span>{meeting.duration}</span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{meeting.location}</span>
                          </div>
                        )}
                        {meeting.attendees > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{meeting.attendees} attendees</span>
                          </div>
                        )}
                      </div>
                      <Badge variant={meeting.type === 'video' ? 'default' : meeting.type === 'in-person' ? 'secondary' : 'outline'}>
                        {meeting.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Date Meetings */}
          {!isSameDay(selectedDate, new Date()) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {format(selectedDate, 'MMM d, yyyy')} Meetings
                  </CardTitle>
                  {selectedDateMeetings.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedDateMeetings.length} event{selectedDateMeetings.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedDateMeetings.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No meetings scheduled</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {selectedDateMeetings.map((meeting) => (
                        <div key={meeting.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                          <div className="flex-1 space-y-1">
                            <p className="font-medium text-sm">{meeting.title}</p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{meeting.time}</span>
                              <span>•</span>
                              <span>{meeting.duration}</span>
                            </div>
                            {meeting.location && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{meeting.location}</span>
                              </div>
                            )}
                            {meeting.attendees > 0 && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>{meeting.attendees} attendees</span>
                              </div>
                            )}
                          </div>
                          <Badge variant={meeting.type === 'video' ? 'default' : meeting.type === 'in-person' ? 'secondary' : 'outline'}>
                            {meeting.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {/* Summarize Button */}
                    <div className="pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleSummarizeSelectedDate()}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Summarize {format(selectedDate, 'MMM d')} Events
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming meetings</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm">{meeting.title}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(meeting.date, 'MMM d')}</span>
                          <span>•</span>
                          <span>{meeting.time}</span>
                        </div>
                        {meeting.attendees > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{meeting.attendees} attendees</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {meeting.duration}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Info */}
          {userInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={userInfo.picture} alt={userInfo.name} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{userInfo.name}</p>
                    <p className="text-xs text-muted-foreground">{userInfo.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Selected Date AI Summary */}
      {showSelectedDateSummary && isAuthenticated && composioConnectionId && selectedDateMeetings.length > 0 && (
        <div className="mt-8" data-ai-summary>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  AI Summary - {format(selectedDate, 'MMM d, yyyy')}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSelectedDateSummary(false)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Selected Date Events:</h4>
                  <div className="grid gap-2">
                    {selectedDateMeetings.map((meeting) => (
                      <div key={meeting.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{meeting.title}</span>
                          <Badge variant="outline">{meeting.time}</Badge>
                        </div>
                        {meeting.description && (
                          <p className="text-sm text-muted-foreground mt-1">{meeting.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <h4 className="font-medium">AI Analysis</h4>
                      {summaryLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                    </div>
                    {summaryLoading ? (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Generating AI insights...</p>
                      </div>
                    ) : selectedDateSummaryData ? (
                      <div className="p-4 bg-muted rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap font-sans">{selectedDateSummaryData}</pre>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Click the summarize button to generate AI insights.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Calendar Summary Section */}
      {isAuthenticated && composioConnectionId && !showSelectedDateSummary && (
        <div className="mt-8">
          <CalendarSummary 
            connectionId={composioConnectionId} 
            timeframe="week" 
          />
        </div>
      )}
    </div>
  )
}
