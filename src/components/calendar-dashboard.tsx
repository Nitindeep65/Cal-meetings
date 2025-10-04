'use client'

import { useState } from 'react'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Video, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Sample meeting data
const sampleMeetings = [
  {
    id: 1,
    title: "Team Standup",
    time: "09:00 AM",
    duration: "30 min",
    type: "video",
    attendees: 5,
    date: new Date(),
  },
  {
    id: 2,
    title: "Client Review",
    time: "02:00 PM", 
    duration: "60 min",
    type: "video",
    attendees: 3,
    date: addDays(new Date(), 1),
  },
  {
    id: 3,
    title: "Sprint Planning",
    time: "10:00 AM",
    duration: "120 min", 
    type: "in-person",
    attendees: 8,
    date: addDays(new Date(), 2),
  }
]

export function CalendarDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

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
      const dayMeetings = sampleMeetings.filter(meeting => isSameDay(meeting.date, day))
      
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

  const selectedDateMeetings = sampleMeetings.filter(meeting => 
    isSameDay(meeting.date, selectedDate)
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
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

        {/* Quick stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Meetings</span>
                <span className="text-2xl font-bold">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Hours Scheduled</span>
                <span className="text-2xl font-bold">18.5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Video Calls</span>
                <span className="text-2xl font-bold">8</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next Up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sampleMeetings.slice(0, 3).map((meeting) => (
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
  )
}