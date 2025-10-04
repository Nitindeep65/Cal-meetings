import { mcpClient, type CalendarEvent } from './mcp-client';
import { geminiService, type MeetingSummary } from './gemini-ai';

export interface EnhancedCalendarEvent extends CalendarEvent {
  summary?: MeetingSummary;
  aiInsights?: {
    preparation?: string[];
    suggestedAgenda?: string[];
    estimatedDuration?: string;
  };
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

class CalendarService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Connect to MCP server
      if (!mcpClient.connected) {
        await mcpClient.connect();
      }
      
      this.isInitialized = true;
      console.log('Calendar service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize calendar service:', error);
      throw error;
    }
  }

  async getEvents(startDate?: string, endDate?: string): Promise<EnhancedCalendarEvent[]> {
    await this.initialize();

    try {
      const events = await mcpClient.getCalendarEvents(startDate, endDate);
      
      // Enhance events with AI summaries for past meetings
      const enhancedEvents: EnhancedCalendarEvent[] = await Promise.all(
        events.map(async (event) => {
          const eventDate = new Date(event.start);
          const now = new Date();
          
          // Generate AI summary for past meetings
          if (eventDate < now && geminiService.isConfigured) {
            try {
              const summary = await geminiService.summarizeMeeting(
                event.title,
                event.description,
                undefined, // No transcript available yet
                event.attendees
              );
              
              return {
                ...event,
                summary,
              };
            } catch (error) {
              console.warn(`Failed to generate summary for event ${event.id}:`, error);
              return event;
            }
          }
          
          // Generate preparation suggestions for upcoming meetings
          if (eventDate > now && geminiService.isConfigured) {
            try {
              const duration = this.calculateDuration(event.start, event.end);
              const improvements = await geminiService.suggestMeetingImprovements(
                event.title,
                duration,
                event.attendees || []
              );
              
              return {
                ...event,
                aiInsights: {
                  preparation: improvements.preparation,
                  suggestedAgenda: improvements.agenda,
                  estimatedDuration: duration,
                },
              };
            } catch (error) {
              console.warn(`Failed to generate insights for event ${event.id}:`, error);
              return event;
            }
          }
          
          return event;
        })
      );

      return enhancedEvents;
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      throw error;
    }
  }

  async createEvent(event: Partial<CalendarEvent>): Promise<EnhancedCalendarEvent> {
    await this.initialize();

    try {
      const createdEvent = await mcpClient.createCalendarEvent(event);
      
      // Generate AI insights for the new event if it's upcoming
      if (geminiService.isConfigured && event.start) {
        const eventDate = new Date(event.start);
        const now = new Date();
        
        if (eventDate > now) {
          try {
            const duration = this.calculateDuration(event.start!, event.end!);
            const improvements = await geminiService.suggestMeetingImprovements(
              event.title!,
              duration,
              event.attendees || []
            );
            
            return {
              ...createdEvent,
              aiInsights: {
                preparation: improvements.preparation,
                suggestedAgenda: improvements.agenda,
                estimatedDuration: duration,
              },
            };
          } catch (error) {
            console.warn('Failed to generate insights for new event:', error);
          }
        }
      }
      
      return createdEvent;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<EnhancedCalendarEvent> {
    await this.initialize();

    try {
      const updatedEvent = await mcpClient.updateCalendarEvent(eventId, updates);
      return updatedEvent;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.initialize();

    try {
      await mcpClient.deleteCalendarEvent(eventId);
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  async getCalendarStats(startDate?: string, endDate?: string): Promise<CalendarStats> {
    try {
      const events = await this.getEvents(startDate, endDate);
      const now = new Date();
      
      const totalMeetings = events.length;
      const upcomingMeetings = events.filter(e => new Date(e.start) > now).length;
      
      // Calculate total hours
      const totalMinutes = events.reduce((total, event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        return total + (end.getTime() - start.getTime()) / (1000 * 60);
      }, 0);
      
      const totalHours = Math.round(totalMinutes / 60 * 100) / 100;
      const averageMeetingDuration = totalMeetings > 0 ? Math.round(totalMinutes / totalMeetings) : 0;

      // Generate AI insights if available
      let productivityScore: number | undefined;
      let trends: string[] | undefined;
      let recommendations: string[] | undefined;

      if (geminiService.isConfigured && events.length > 0) {
        try {
          const meetingsForAnalysis = events
            .filter(e => e.summary)
            .map(e => ({
              title: e.title,
              date: e.start,
              attendees: e.attendees || [],
              summary: e.summary,
            }));

          if (meetingsForAnalysis.length > 0) {
            const insights = await geminiService.generateMeetingInsights(meetingsForAnalysis);
            productivityScore = insights.productivityScore;
            trends = insights.trends;
            recommendations = insights.recommendations;
          }
        } catch (error) {
          console.warn('Failed to generate meeting insights:', error);
        }
      }

      return {
        totalMeetings,
        totalHours,
        upcomingMeetings,
        averageMeetingDuration,
        productivityScore,
        trends,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to get calendar stats:', error);
      
      // Return fallback stats
      return {
        totalMeetings: 0,
        totalHours: 0,
        upcomingMeetings: 0,
        averageMeetingDuration: 0,
      };
    }
  }

  private calculateDuration(start: string, end: string): string {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const durationMs = endTime.getTime() - startTime.getTime();
    const minutes = Math.round(durationMs / (1000 * 60));
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
  }

  async disconnect(): Promise<void> {
    if (mcpClient.connected) {
      await mcpClient.disconnect();
    }
    this.isInitialized = false;
  }

  get isReady(): boolean {
    return this.isInitialized && mcpClient.connected;
  }

  get hasAI(): boolean {
    return geminiService.isConfigured;
  }
}

// Export singleton instance
export const calendarService = new CalendarService();