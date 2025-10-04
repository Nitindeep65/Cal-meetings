import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  attendees?: string[];
  location?: string;
}

export interface MCPCalendarResponse {
  events: CalendarEvent[];
  success: boolean;
  error?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
  attendees?: Array<{ email: string }>;
}

interface MCPToolResult {
  content?: Array<{ text?: string }>;
}

class MCPComposioClient {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      // Create SSE transport with the Composio MCP server endpoint
      this.transport = new SSEClientTransport(
        new URL('https://apollo.composio.dev/v3/mcp/a69aa5ec-c99b-4238-94eb-b13523732fc6/sse?include_composio_helper_actions=true')
      );

      // Create client
      this.client = new Client(
        {
          name: 'cal-meetings-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
            resources: {},
          },
        }
      );

      // Connect to the server
      await this.client.connect(this.transport);
      this.isConnected = true;
      
      console.log('Successfully connected to Composio MCP server');
    } catch (error) {
      console.error('Failed to connect to Composio MCP server:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.isConnected = false;
  }

  async getCalendarEvents(
    startDate?: string,
    endDate?: string
  ): Promise<CalendarEvent[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      // Call the Google Calendar list events tool via Composio
      const result = await this.client.callTool({
        name: 'GOOGLECALENDAR_EVENTS_LIST',
        arguments: {
          calendarId: 'primary',
          timeMin: startDate || new Date().toISOString(),
          timeMax: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        },
      });

      // Parse the response and convert to our CalendarEvent format
      const resultContent = (result as MCPToolResult).content;
      const responseText = resultContent?.[0]?.text;
      
      if (!responseText) {
        return [];
      }
      
      const response = JSON.parse(responseText);
      
      // Handle Composio response format
      if (response.successful && response.data && response.data.items) {
        const events: GoogleCalendarEvent[] = response.data.items;
        
        return events.map((event: GoogleCalendarEvent) => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          start: event.start?.dateTime || event.start?.date || '',
          end: event.end?.dateTime || event.end?.date || '',
          description: event.description,
          attendees: event.attendees?.map((attendee) => attendee.email) || [],
          location: event.location,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      throw error;
    }
  }

  async createCalendarEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name: 'GOOGLECALENDAR_CREATE_EVENT',
        arguments: {
          calendar_id: 'primary',
          summary: event.title,
          start_datetime: event.start,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          description: event.description,
          location: event.location,
        },
      });

      const resultContent = (result as MCPToolResult).content;
      const responseText = resultContent?.[0]?.text;
      
      if (!responseText) {
        throw new Error('No response from calendar create event');
      }
      
      const response = JSON.parse(responseText);
      const createdEvent: GoogleCalendarEvent = response.successful ? response.data : response;
      
      return {
        id: createdEvent.id,
        title: createdEvent.summary || 'Untitled Event',
        start: createdEvent.start?.dateTime || createdEvent.start?.date || '',
        end: createdEvent.end?.dateTime || createdEvent.end?.date || '',
        description: createdEvent.description,
        attendees: createdEvent.attendees?.map((attendee) => attendee.email) || [],
        location: createdEvent.location,
      };
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  async updateCalendarEvent(
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name: 'GOOGLECALENDAR_UPDATE_EVENT',
        arguments: {
          calendar_id: 'primary',
          event_id: eventId,
          summary: updates.title,
          start_datetime: updates.start,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          description: updates.description,
          location: updates.location,
        },
      });

      const resultContent = (result as MCPToolResult).content;
      const responseText = resultContent?.[0]?.text;
      
      if (!responseText) {
        throw new Error('No response from calendar update event');
      }
      
      const response = JSON.parse(responseText);
      const updatedEvent: GoogleCalendarEvent = response.successful ? response.data : response;
      
      return {
        id: updatedEvent.id,
        title: updatedEvent.summary || 'Untitled Event',
        start: updatedEvent.start?.dateTime || updatedEvent.start?.date || '',
        end: updatedEvent.end?.dateTime || updatedEvent.end?.date || '',
        description: updatedEvent.description,
        attendees: updatedEvent.attendees?.map((attendee) => attendee.email) || [],
        location: updatedEvent.location,
      };
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      await this.client.callTool({
        name: 'GOOGLECALENDAR_DELETE_EVENT',
        arguments: {
          calendar_id: 'primary',
          event_id: eventId,
        },
      });
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const mcpClient = new MCPComposioClient();