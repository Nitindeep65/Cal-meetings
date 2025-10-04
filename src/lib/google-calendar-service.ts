import { google } from 'googleapis'

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  attendees?: string[];
  location?: string;
}

export interface CalendarStats {
  totalMeetings: number;
  totalHours: number;
  upcomingMeetings: number;
  averageMeetingDuration: number;
  productivityScore?: number;
  trends?: string[];
  recommendations?: string[];
}

class GoogleCalendarService {
  private getCalendarClient(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    return google.calendar({ version: 'v3', auth: oauth2Client })
  }

  async getEvents(accessToken: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    try {
      const calendar = this.getCalendarClient(accessToken)
      
      const timeMin = startDate ? new Date(startDate).toISOString() : new Date().toISOString()
      const timeMax = endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      })

      const events = response.data.items || []
      
      return events.map(event => ({
        id: event.id!,
        title: event.summary || 'No title',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        description: event.description || undefined,
        attendees: event.attendees?.map(attendee => attendee.email!).filter(Boolean),
        location: event.location || undefined,
      }))
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      throw new Error('Failed to fetch calendar events')
    }
  }

  async getStats(accessToken: string): Promise<CalendarStats> {
    try {
      const events = await this.getEvents(accessToken)
      const now = new Date()
      
      const upcomingEvents = events.filter(event => new Date(event.start) > now)
      const totalHours = events.reduce((total, event) => {
        const start = new Date(event.start)
        const end = new Date(event.end)
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)
      
      const averageDuration = events.length > 0 ? totalHours / events.length : 0
      
      return {
        totalMeetings: events.length,
        totalHours: Math.round(totalHours * 100) / 100,
        upcomingMeetings: upcomingEvents.length,
        averageMeetingDuration: Math.round(averageDuration * 100) / 100,
        productivityScore: Math.min(100, Math.max(0, 100 - (events.length * 2))), // Simple heuristic
        trends: [
          `${upcomingEvents.length} meetings scheduled`,
          `Average meeting duration: ${Math.round(averageDuration * 60)} minutes`,
        ],
        recommendations: [
          averageDuration > 1 ? 'Consider shorter meetings for better efficiency' : 'Good meeting duration management',
          upcomingEvents.length > 10 ? 'Heavy meeting schedule ahead' : 'Balanced meeting schedule',
        ],
      }
    } catch (error) {
      console.error('Error calculating calendar stats:', error)
      throw new Error('Failed to calculate calendar stats')
    }
  }
}

export const googleCalendarService = new GoogleCalendarService()