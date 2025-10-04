'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Target, 
  Brain,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Star,
  Lightbulb,
  Users
} from 'lucide-react'
// Alert components imported inline since they may not exist

interface CalendarSummaryProps {
  connectionId: string
  timeframe?: 'today' | 'week' | 'month'
}

interface EventSummary {
  summary: string
  upcomingHighlights: string[]
  timeInsights: string[]
  recommendations: string[]
  productivity: {
    score: number
    busyHours: string[]
    freeSlots: string[]
  }
}

interface ActionablePlans {
  dailyPlans: Array<{
    date: string
    priorities: string[]
    timeBlocks: Array<{
      time: string
      activity: string
      type: 'meeting' | 'focus' | 'break' | 'prep'
    }>
  }>
  weeklyGoals: string[]
  optimizations: string[]
}

interface SummaryResponse {
  summary: EventSummary
  actionablePlans: ActionablePlans | null
  eventsCount: number
  timeframe: string
  generatedAt: string
}

interface TodayEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  duration: string
  attendeeCount: number
  hasLocation: boolean
  isUpcoming: boolean
}

interface SingleEventAnalysis {
  eventId: string
  eventTitle: string
  overview: string
  preparationInsights: string[]
  meetingType: string
  importance: {
    level: number
    reasoning: string
  }
  timeOptimization: {
    durationAnalysis: string
    timingConcerns: string[]
  }
  attendeeInsights: string
  actionRecommendations: {
    before: string[]
    during: string[]
    after: string[]
  }
  potentialOutcomes: string[]
  successMetrics: string[]
  followUpSuggestions: string[]
  analyzedAt: string
  error?: string
}

interface SingleEventResponse {
  analysis: SingleEventAnalysis
  eventDetails: {
    id: string
    title: string
    duration: string
    timeFormatted: string
    attendees: string[]
    location?: string
    organizer?: string
  }
  analyzedAt: string
}

export function CalendarSummary({ connectionId, timeframe = 'week' }: CalendarSummaryProps) {
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('summary')
  
  // Single event state
  const [singleEventMode, setSingleEventMode] = useState(false)
  const [todaysEvents, setTodaysEvents] = useState<TodayEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [singleEventAnalysis, setSingleEventAnalysis] = useState<SingleEventResponse | null>(null)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingSingleEvent, setLoadingSingleEvent] = useState(false)

  const generateSummary = async (includePlans = false) => {
    setLoading(true)
    setError(null)

    try {
      console.log(`🤖 Generating AI summary for ${timeframe}...`)

      // First, get the events from composio service
      const eventsResponse = await fetch('/api/composio/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'list_events',
          userId: connectionId,
          params: {
            timeMin: getTimeframeStart(timeframe).toISOString(),
            timeMax: getTimeframeEnd(timeframe).toISOString(),
          },
        }),
      })

      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch calendar events')
      }

      const eventsData = await eventsResponse.json()
      const events = eventsData.events || []

      console.log(`📊 Found ${events.length} events for summarization`)

      // Transform events to match the expected format
      interface RawEvent {
        id: string;
        summary?: string;
        description?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        attendees?: Array<{ displayName?: string; email?: string }>;
        location?: string;
        status?: string;
      }

      const formattedEvents = events.map((event: RawEvent) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        attendees: event.attendees?.map((attendee) => 
          attendee.displayName || attendee.email
        ).filter(Boolean) || [],
        location: event.location || undefined,
        status: event.status || 'confirmed',
      }))

      // Call the summarization API
      const summaryResponse = await fetch('/api/calendar/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: formattedEvents,
          timeframe,
          preferences: {
            generatePlans: includePlans,
            workingHours: { start: '9:00 AM', end: '5:00 PM' },
            priorities: ['Important meetings', 'Focus time', 'Project work'],
            focusBlocks: 90,
          },
        }),
      })

      if (!summaryResponse.ok) {
        const errorData = await summaryResponse.json()
        throw new Error(errorData.error || 'Failed to generate summary')
      }

      const summary = await summaryResponse.json()
      setSummaryData(summary)
      console.log('✅ AI summary generated successfully')

    } catch (err) {
      console.error('Error generating summary:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  const getTimeframeStart = (timeframe: string): Date => {
    const now = new Date()
    switch (timeframe) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      case 'week':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        return startOfWeek
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1)
      default:
        return now
    }
  }

  const getTimeframeEnd = (timeframe: string): Date => {
    const now = new Date()
    switch (timeframe) {
      case 'today':
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endOfDay.setHours(23, 59, 59, 999)
        return endOfDay
      case 'week':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        return endOfWeek
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  }

  // Single event functions
  const fetchTodaysEvents = async () => {
    setLoadingEvents(true)
    setError(null)
    
    try {
      console.log('📅 Fetching today\'s events for selection...')
      const response = await fetch(`/api/calendar/single-event?connectionId=${connectionId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch today\'s events')
      }
      
      const data = await response.json()
      setTodaysEvents(data.events)
      console.log(`✅ Found ${data.events.length} events for today`)
      
    } catch (err) {
      console.error('Error fetching today\'s events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch today\'s events')
    } finally {
      setLoadingEvents(false)
    }
  }

  const analyzeSingleEvent = async () => {
    if (!selectedEventId) {
      setError('Please select an event to analyze')
      return
    }
    
    setLoadingSingleEvent(true)
    setError(null)
    
    try {
      console.log('🔍 Analyzing single event:', selectedEventId)
      const response = await fetch('/api/calendar/single-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId,
          eventId: selectedEventId,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze event')
      }
      
      const analysis = await response.json()
      setSingleEventAnalysis(analysis)
      setActiveTab('single-event')
      console.log('✅ Single event analysis completed')
      
    } catch (err) {
      console.error('Error analyzing single event:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze event')
    } finally {
      setLoadingSingleEvent(false)
    }
  }

  const toggleSingleEventMode = () => {
    setSingleEventMode(!singleEventMode)
    if (!singleEventMode) {
      fetchTodaysEvents()
    } else {
      // Reset single event state
      setTodaysEvents([])
      setSelectedEventId('')
      setSingleEventAnalysis(null)
      setActiveTab('summary')
    }
  }

  const getProductivityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Users className="h-4 w-4" />
      case 'focus': return <Target className="h-4 w-4" />
      case 'break': return <Clock className="h-4 w-4" />
      case 'prep': return <CheckCircle className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  if (!connectionId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Please connect your calendar to generate AI summaries
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Calendar Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => generateSummary(false)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Summary
            </Button>
            <Button 
              onClick={() => generateSummary(true)}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Summary + Plans
            </Button>
            <Button 
              onClick={toggleSingleEventMode}
              disabled={loading || loadingEvents}
              variant={singleEventMode ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {singleEventMode ? 'Back to Summary' : 'Analyze Single Event'}
            </Button>
          </div>
          
          {/* Single Event Selection */}
          {singleEventMode && (
            <div className="mt-4 space-y-3">
              <div className="text-sm font-medium">Select Today&apos;s Meeting to Analyze:</div>
              {loadingEvents ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading today&apos;s events...
                </div>
              ) : todaysEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No events found for today
                </div>
              ) : (
                <div className="space-y-2">
                  <select 
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select an event...</option>
                    {todaysEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.startTime} - {event.title} 
                        {event.duration && ` (${event.duration})`}
                        {event.attendeeCount > 0 && ` • ${event.attendeeCount} attendees`}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={analyzeSingleEvent}
                    disabled={!selectedEventId || loadingSingleEvent}
                    className="flex items-center gap-2"
                  >
                    {loadingSingleEvent ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4" />
                    )}
                    Analyze Event
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <div>
                <div className="font-medium">Error</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Content */}
      {(summaryData || singleEventAnalysis) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${singleEventAnalysis ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="summary" disabled={!summaryData}>Overview</TabsTrigger>
            <TabsTrigger value="insights" disabled={!summaryData}>Insights</TabsTrigger>
            <TabsTrigger value="plans" disabled={!summaryData?.actionablePlans}>
              Action Plans
            </TabsTrigger>
            {singleEventAnalysis && (
              <TabsTrigger value="single-event">Event Analysis</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {summaryData && (
              <>
                {/* Main Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {summaryData.timeframe.charAt(0).toUpperCase() + summaryData.timeframe.slice(1)} Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {summaryData.summary.summary}
                    </p>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {summaryData.eventsCount} events
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(summaryData.generatedAt).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Productivity Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Productivity Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`text-3xl font-bold ${getProductivityColor(summaryData.summary.productivity.score)}`}>
                    {summaryData.summary.productivity.score}/100
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      {summaryData.summary.productivity.busyHours.map((hour, index) => (
                        <Badge key={index} variant="secondary">
                          Busy: {hour}
                        </Badge>
                      ))}
                      {summaryData.summary.productivity.freeSlots.map((slot, index) => (
                        <Badge key={index} variant="outline">
                          Free: {slot}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Highlights */}
            {summaryData.summary.upcomingHighlights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Key Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summaryData.summary.upcomingHighlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
              </>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {summaryData && (
              <>
                {/* Time Insights */}
                {summaryData.summary.timeInsights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Time Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summaryData.summary.timeInsights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-blue-600" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {summaryData.summary.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summaryData.summary.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-600" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
              </>
            )}
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            {summaryData && summaryData.actionablePlans && (
              <>
                {/* Weekly Goals */}
                {summaryData.actionablePlans.weeklyGoals.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Weekly Goals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summaryData.actionablePlans.weeklyGoals.map((goal, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Target className="h-4 w-4 mt-0.5 text-green-600" />
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Optimizations */}
                {summaryData.actionablePlans.optimizations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Schedule Optimizations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summaryData.actionablePlans.optimizations.map((opt, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 mt-0.5 text-blue-600" />
                            <span>{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Daily Plans */}
                {summaryData.actionablePlans.dailyPlans.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Daily Plans</h3>
                    {summaryData.actionablePlans.dailyPlans.map((plan, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {new Date(plan.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Priorities */}
                          {plan.priorities.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Priorities</h4>
                              <div className="flex flex-wrap gap-2">
                                {plan.priorities.map((priority, pIndex) => (
                                  <Badge key={pIndex} variant="secondary">
                                    {priority}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Time Blocks */}
                          {plan.timeBlocks.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Schedule</h4>
                              <div className="space-y-2">
                                {plan.timeBlocks.map((block, bIndex) => (
                                  <div key={bIndex} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                    {getTypeIcon(block.type)}
                                    <span className="font-mono text-sm">{block.time}</span>
                                    <span className="flex-1">{block.activity}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {block.type}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Single Event Analysis Tab */}
          <TabsContent value="single-event" className="space-y-4">
            {singleEventAnalysis && (
              <>
                {/* Event Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {singleEventAnalysis.eventDetails.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {singleEventAnalysis.eventDetails.timeFormatted}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {singleEventAnalysis.eventDetails.attendees.length} attendees
                        </span>
                        <span>{singleEventAnalysis.eventDetails.duration}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {singleEventAnalysis.analysis.overview}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Meeting Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-4 w-4" />
                        Meeting Type & Importance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="font-medium">{singleEventAnalysis.analysis.meetingType}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">
                              {singleEventAnalysis.analysis.importance.level}/10 Importance
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {singleEventAnalysis.analysis.importance.reasoning}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4" />
                        Time Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {singleEventAnalysis.analysis.timeOptimization.durationAnalysis}
                        </p>
                        {singleEventAnalysis.analysis.timeOptimization.timingConcerns.length > 0 && (
                          <div>
                            <div className="font-medium text-sm mb-1">Timing Concerns:</div>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {singleEventAnalysis.analysis.timeOptimization.timingConcerns.map((concern, index) => (
                                <li key={index} className="flex items-start gap-1">
                                  <AlertCircle className="h-3 w-3 mt-0.5 text-yellow-500" />
                                  {concern}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Preparation Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Preparation Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {singleEventAnalysis.analysis.preparationInsights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                          <span className="text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Action Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Action Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 text-blue-600">Before Meeting</h4>
                        <ul className="space-y-1 text-sm">
                          {singleEventAnalysis.analysis.actionRecommendations.before.map((action, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-blue-500">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 text-green-600">During Meeting</h4>
                        <ul className="space-y-1 text-sm">
                          {singleEventAnalysis.analysis.actionRecommendations.during.map((action, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-green-500">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 text-purple-600">After Meeting</h4>
                        <ul className="space-y-1 text-sm">
                          {singleEventAnalysis.analysis.actionRecommendations.after.map((action, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-purple-500">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Potential Outcomes & Success Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4" />
                        Potential Outcomes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {singleEventAnalysis.analysis.potentialOutcomes.map((outcome, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">→</span>
                            {outcome}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle className="h-4 w-4" />
                        Success Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {singleEventAnalysis.analysis.successMetrics.map((metric, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                            {metric}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Follow-up Suggestions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      Follow-up Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {singleEventAnalysis.analysis.followUpSuggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <RefreshCw className="h-4 w-4 mt-0.5 text-blue-500" />
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {singleEventAnalysis.analysis.error && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertCircle className="h-4 w-4" />
                        <div className="text-sm">{singleEventAnalysis.analysis.error}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}