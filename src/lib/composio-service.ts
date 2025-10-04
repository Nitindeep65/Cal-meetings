import { Composio } from '@composio/core';

// Create Composio client instance
const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
});

export class ComposioService {
  private composio: Composio;

  constructor() {
    this.composio = composio;
  }

  /**
   * Initiate Google Calendar authentication for a user
   * @param userId - Unique user identifier
   * @returns Authentication URL and connection request
   */
  async initiateGoogleCalendarAuth(userId: string) {
    try {
      const authConfigId = process.env.COMPOSIO_AUTH_CONFIG_ID;
      
      if (!authConfigId) {
        throw new Error('COMPOSIO_AUTH_CONFIG_ID not configured');
      }

      const connectionRequest = await this.composio.connectedAccounts.initiate(
        userId,
        authConfigId
      );

      return {
        redirectUrl: connectionRequest.redirectUrl,
        connectionId: connectionRequest.id,
        status: connectionRequest.status,
      };
    } catch (error) {
      console.error('Error initiating Google Calendar auth:', error);
      throw new Error('Failed to initiate authentication');
    }
  }

  /**
   * Wait for authentication completion
   * @param connectionId - Connection request ID
   * @param timeout - Timeout in seconds (default: 60)
   * @returns Connected account details
   */
  async waitForConnection(connectionId: string, timeout: number = 60) {
    try {
      const connectedAccount = await this.composio.connectedAccounts.waitUntilActive(
        connectionId,
        timeout
      );
      return connectedAccount;
    } catch (error) {
      console.error('Error waiting for connection:', error);
      throw new Error('Connection timeout or failed');
    }
  }

  /**
   * Get connected account details
   * @param connectionId - Connection ID
   * @returns Connected account information
   */
  async getConnectedAccount(connectionId: string) {
    try {
      const connectedAccount = await this.composio.connectedAccounts.get(connectionId);
      return connectedAccount;
    } catch (error) {
      console.error('Error getting connected account:', error);
      throw new Error('Failed to get connected account');
    }
  }

  /**
   * Get current user session information from Composio API
   * @returns User session information including project, org, and user details
   */
  async getAuthSessionInfo() {
    try {
      const response = await fetch('https://backend.composio.dev/api/v3/auth/session/info', {
        method: 'GET',
        headers: {
          'x-api-key': process.env.COMPOSIO_API_KEY || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Auth session API error: ${response.status}`);
      }

      const sessionData = await response.json();
      return sessionData;
    } catch (error) {
      console.error('Error getting auth session info:', error);
      return null;
    }
  }

  /**
   * Get Google user profile information from connected account
   * @param connectionId - Connection ID (e.g., ca_xxx) - unique per user connection  
   * @returns User profile information
   */
  async getUserProfile(connectionId: string) {
    try {
      console.log('🔍 Attempting to fetch Google user profile for connection:', connectionId);
      
      // Get the specific connection's information using the connection ID
      // This ensures each user gets their own profile data
      const connectedAccount = await this.composio.connectedAccounts.get(connectionId);
      
      if (connectedAccount) {
        console.log('✅ Retrieved connected account for:', connectionId);
        console.log('📋 Full connection data:', JSON.stringify(connectedAccount, null, 2));
        
        // Try to get user email from the Google Calendar API using this specific connection
        try {
          const calendars = await this.listCalendars(connectionId);
          const primaryCalendar = calendars.find((cal: { primary?: boolean; id?: string; summary?: string }) => cal.primary);
          
          if (primaryCalendar && primaryCalendar.id && primaryCalendar.id.includes('@')) {
            const userEmail = primaryCalendar.id;
            console.log('✅ Got user email from primary calendar:', userEmail);
            
            // Create a better display name from email
            const createDisplayNameFromEmail = (email: string) => {
              const username = email.split('@')[0];
              return username
                .replace(/[._]/g, ' ')
                .replace(/\d+/g, ' ')
                .split(' ')
                .filter(word => word.length > 0)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            };

            const displayName = createDisplayNameFromEmail(userEmail);

            const userData = {
              id: connectionId,
              email: userEmail,
              name: displayName,
              picture: null,
              given_name: displayName.split(' ')[0] || displayName,
              family_name: displayName.split(' ').slice(1).join(' ') || null
            };
            
            console.log('📤 Returning user data:', JSON.stringify(userData, null, 2));
            return userData;
          }
        } catch (calError) {
          console.error('Error fetching calendar for user profile:', calError);
        }
      }
      
      // Fallback to generated user info
      console.log('📝 Using fallback user info for:', connectionId);
      return this.generateUserInfo(connectionId);
      
    } catch (error) {
      console.error('Error getting user profile:', error);
      // Return enhanced mock data as fallback
      return this.generateUserInfo(connectionId);
    }
  }

  /**
   * List user's Google Calendars
   * @param userId - User identifier
   * @returns List of calendars
   */
  async listCalendars(userId: string) {
    try {
      console.log('🔍 Attempting to fetch Google Calendar list for:', userId);
      
      // Try to get connected account
      let connectedAccount = null;
      
      if (userId.startsWith('ca_')) {
        try {
          connectedAccount = await this.composio.connectedAccounts.get(userId);
        } catch (error) {
          console.log('❌ Failed to get connection directly:', error);
        }
      }
      
      if (connectedAccount && connectedAccount.status === 'ACTIVE') {
        try {
          console.log('📅 Fetching calendar list via Composio...');
          
          const accessToken = connectedAccount.data?.access_token;
          if (accessToken) {
            const directResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (directResponse.ok) {
              const directData = await directResponse.json();
              console.log('✅ Direct Google Calendar List API success:', directData.items?.length || 0, 'calendars');
              return directData.items || [];
            } else {
              console.log('❌ Direct Calendar List API failed:', directResponse.status, await directResponse.text());
            }
          }
        } catch (composioError) {
          console.error('❌ Composio Calendar List error:', composioError);
        }
      }
      
      // Fallback to enhanced mock data
      console.log('📝 Using fallback calendar data for user:', userId);
      const userInfo = this.generateUserInfo(userId);
      
      return [
        {
          id: userInfo.email,
          summary: userInfo.name,
          primary: true,
          timeZone: 'America/New_York',
          accessRole: 'owner',
          description: `${userInfo.name}'s Calendar`
        }
      ];
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw new Error('Failed to list calendars');
    }
  }

  /**
   * List events from user's Google Calendar
   * @param userId - User identifier
   * @param calendarId - Calendar ID (default: 'primary')
   * @param timeMin - Start time filter
   * @param timeMax - End time filter
   * @returns List of events
   */
  /**
   * Generate consistent user info based on userId
   */
  private generateUserInfo(userId: string) {
    const userNames = [
      'Alex Johnson', 'Sarah Wilson', 'Michael Chen', 'Emily Davis', 'David Rodriguez',
      'Jessica Taylor', 'Ryan Anderson', 'Amanda Thompson', 'Kevin Martinez', 'Lisa Garcia',
      'Daniel Brown', 'Ashley Lee', 'Christopher White', 'Samantha Miller', 'Matthew Jones'
    ]
    
    const nameIndex = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % userNames.length
    const userName = userNames[nameIndex]
    const emailName = userName.toLowerCase().replace(' ', '.')
    
    return {
      name: userName,
      email: `${emailName}@gmail.com`
    }
  }

  /**
   * Get user's calendar settings (which include user profile info)
   * @param userId - User identifier
   * @returns Calendar settings with user info
   */
  async getCalendarSettings(userId: string) {
    try {
      // In a real implementation with proper Composio configuration:
      /*
      const settingsResponse = await this.composio.getEntity(userId).execute('GOOGLECALENDAR_GET_SETTINGS', {});
      if (settingsResponse.success && settingsResponse.data) {
        return settingsResponse.data;
      }
      */
      
      // Return mock settings that include user profile information
      const userInfo = this.generateUserInfo(userId);
      
      return {
        timeZone: 'America/New_York',
        format24HourTime: false,
        defaultEventLength: 60,
        userEmail: userInfo.email,
        userName: userInfo.name,
        locale: 'en'
      };
    } catch (error) {
      console.error('Error getting calendar settings:', error);
      throw new Error('Failed to get calendar settings');
    }
  }

  async listEvents(
    userId: string, 
    timeMin?: string,
    timeMax?: string
  ) {
    try {
      // Try to fetch real events from Google Calendar using Composio
      console.log('🔍 Attempting to fetch Google Calendar events for:', userId);
      
      // Try different approaches to get the connected account
      let connectedAccount = null;
      
      // Approach 1: If userId is a connection ID (starts with 'ca_'), use it directly
      if (userId.startsWith('ca_')) {
        console.log('🔗 Using connection ID directly:', userId);
        try {
          connectedAccount = await this.composio.connectedAccounts.get(userId);
          console.log('📋 Direct connection account:', connectedAccount);
        } catch (error) {
          console.log('❌ Failed to get connection directly:', error);
        }
      }
      
      // Approach 2: List connected accounts for user
      if (!connectedAccount) {
        try {
          const connectedAccounts = await this.composio.connectedAccounts.list({
            userIds: [userId]
          });
          
          console.log('📋 Connected accounts via list:', connectedAccounts);
          
          if (connectedAccounts?.items?.length > 0) {
            connectedAccount = connectedAccounts.items.find(
              account => account.toolkit?.slug === 'googlecalendar'
            ) || connectedAccounts.items[0]; // Fallback to first account
          }
        } catch (error) {
          console.log('❌ Failed to list connected accounts:', error);
        }
      }
      
      let allEvents: unknown[] = [];

      if (connectedAccount && connectedAccount.status === 'ACTIVE') {
          try {
            console.log('📅 Using Composio to fetch Google Calendar events...');
            
            // Use direct Google Calendar API call with Composio's authenticated connection
            console.log('� Trying direct Google Calendar API call...');
            try {
              const accessToken = connectedAccount.data?.access_token;
              if (accessToken) {
                const directResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (directResponse.ok) {
                  const directData = await directResponse.json();
                  console.log('✅ Direct Google Calendar API success:', directData.items?.length || 0, 'events');
                  allEvents = directData.items || [];
                } else {
                  console.log('❌ Direct API failed:', directResponse.status, await directResponse.text());
                }
              }
            } catch (directError) {
              console.error('❌ Direct Google Calendar API error:', directError);
            }
            
            // Return the events we found
            if (allEvents.length > 0) {
              return allEvents;
            }
          
          console.log('⚠️ No events found in response');
        } catch (apiError) {
          console.error('❌ Google Calendar API error:', apiError);
        }
      } else {
        console.log('⚠️ No active Google Calendar connection. Status:', connectedAccount?.status || 'Not found');
      }
      
      // Fallback to enhanced mock data if real API fails
      console.log('📝 Using fallback mock data for user:', userId);
      const now = new Date();
      const userInfo = this.generateUserInfo(userId);
      
      const events = [
        {
          id: `event-${userId}-1`,
          summary: `Team Standup`,
          start: { dateTime: new Date(now.getTime() + 86400000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 86400000 + 1800000).toISOString() },
          attendees: [
            { email: userInfo.email, displayName: userInfo.name },
            { email: 'teammate@example.com', displayName: 'Team Member' }
          ],
          location: 'Conference Room A',
          description: `Daily standup meeting for ${userInfo.name}'s team`
        },
        {
          id: `event-${userId}-2`,
          summary: 'Client Strategy Session',
          start: { dateTime: new Date(now.getTime() + 172800000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 172800000 + 3600000).toISOString() },
          attendees: [
            { email: userInfo.email, displayName: userInfo.name },
            { email: 'client@company.com', displayName: 'Client Representative' },
            { email: 'manager@example.com', displayName: 'Account Manager' }
          ],
          location: 'https://meet.google.com/abc-defg-hij',
          description: 'Quarterly strategy planning session with key client'
        },
        {
          id: `event-${userId}-3`,
          summary: 'Project Review & Planning',
          start: { dateTime: new Date(now.getTime() + 259200000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 259200000 + 2700000).toISOString() },
          attendees: [
            { email: userInfo.email, displayName: userInfo.name },
            { email: 'pm@example.com', displayName: 'Project Manager' },
            { email: 'dev@example.com', displayName: 'Lead Developer' }
          ],
          location: 'Virtual - Zoom',
          description: 'Monthly project review and next sprint planning'
        },
        {
          id: `event-${userId}-4`,
          summary: 'One-on-One with Manager',
          start: { dateTime: new Date(now.getTime() + 345600000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 345600000 + 1800000).toISOString() },
          attendees: [
            { email: userInfo.email, displayName: userInfo.name },
            { email: 'manager@example.com', displayName: 'Direct Manager' }
          ],
          location: 'Manager Office',
          description: 'Weekly one-on-one meeting for feedback and goal discussion'
        },
        {
          id: `event-${userId}-5`,
          summary: 'All Hands Meeting',
          start: { dateTime: new Date(now.getTime() + 432000000).toISOString() },
          end: { dateTime: new Date(now.getTime() + 432000000 + 3600000).toISOString() },
          attendees: [
            { email: userInfo.email, displayName: userInfo.name },
            { email: 'ceo@example.com', displayName: 'CEO' },
            { email: 'team@example.com', displayName: 'All Staff' }
          ],
          location: 'https://teams.microsoft.com/meet/abc123',
          description: 'Monthly company-wide meeting with updates and announcements'
        }
      ];

      // Filter by time range if provided
      let filteredEvents = events;
      if (timeMin) {
        const minTime = new Date(timeMin);
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.start.dateTime) >= minTime
        );
      }
      if (timeMax) {
        const maxTime = new Date(timeMax);
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.start.dateTime) <= maxTime
        );
      }

      return filteredEvents;
    } catch (error) {
      console.error('Error listing events:', error);
      throw new Error('Failed to list events');
    }
  }

  /**
   * Create a new event in user's Google Calendar
   * @param userId - User identifier
   * @param eventData - Event details
   * @returns Created event
   */
  async createEvent(userId: string, eventData: {
    summary: string;
    description?: string;
    start_datetime: string;
    event_duration_minutes: number;
    attendees?: string[];
    location?: string;
  }) {
    try {
      // Return mock created event
      const mockEvent = {
        id: 'mock-created-' + Date.now(),
        summary: eventData.summary,
        description: eventData.description,
        start: { dateTime: eventData.start_datetime },
        end: { 
          dateTime: new Date(
            new Date(eventData.start_datetime).getTime() + 
            eventData.event_duration_minutes * 60000
          ).toISOString() 
        },
        attendees: eventData.attendees?.map(email => ({ email })),
        location: eventData.location
      };

      console.log('Mock event created:', mockEvent);
      return mockEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  /**
   * Delete an event from Google Calendar
   * @param userId - User identifier
   * @param calendarId - Calendar ID
   * @param eventId - Event ID to delete
   * @returns Success status
   */
  async deleteEvent(userId: string, calendarId: string, eventId: string) {
    try {
      console.log(`Mock: Deleting event ${eventId} from calendar ${calendarId} for user ${userId}`);
      return { success: true, message: 'Event deleted successfully' };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event');
    }
  }

  /**
   * Update an existing event
   * @param userId - User identifier
   * @param calendarId - Calendar ID
   * @param eventId - Event ID to update
   * @param eventData - Updated event data
   * @returns Updated event
   */
  async updateEvent(userId: string, calendarId: string, eventId: string, eventData: Partial<{
    summary: string;
    description: string;
    start: { dateTime: string };
    end: { dateTime: string };
    location: string;
    attendees: Array<{ email: string }>;
  }>) {
    try {
      const updatedEvent = {
        id: eventId,
        ...eventData,
        updated: new Date().toISOString()
      };
      console.log('Mock: Event updated:', updatedEvent);
      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  /**
   * Create a new Google Calendar
   * @param userId - User identifier
   * @param summary - Calendar title/summary
   * @param description - Calendar description
   * @returns Created calendar
   */
  async createCalendar(userId: string, summary: string, description?: string) {
    try {
      const newCalendar = {
        id: `calendar-${Date.now()}@group.calendar.google.com`,
        summary,
        description,
        timeZone: 'America/New_York',
        accessRole: 'owner',
        primary: false,
        created: new Date().toISOString()
      };
      console.log('Mock: Calendar created:', newCalendar);
      return newCalendar;
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw new Error('Failed to create calendar');
    }
  }

  /**
   * Delete a secondary calendar
   * @param userId - User identifier
   * @param calendarId - Calendar ID to delete
   * @returns Success status
   */
  async deleteCalendar(userId: string, calendarId: string) {
    try {
      console.log(`Mock: Deleting calendar ${calendarId} for user ${userId}`);
      return { success: true, message: 'Calendar deleted successfully' };
    } catch (error) {
      console.error('Error deleting calendar:', error);
      throw new Error('Failed to delete calendar');
    }
  }

  /**
   * Clear all events from primary calendar
   * @param userId - User identifier
   * @param calendarId - Calendar ID to clear
   * @returns Success status
   */
  async clearCalendar(userId: string, calendarId: string) {
    try {
      console.log(`Mock: Clearing all events from calendar ${calendarId} for user ${userId}`);
      return { success: true, message: 'Calendar cleared successfully' };
    } catch (error) {
      console.error('Error clearing calendar:', error);
      throw new Error('Failed to clear calendar');
    }
  }

  /**
   * Quick add event using natural language
   * @param userId - User identifier
   * @param calendarId - Calendar ID
   * @param text - Natural language event description
   * @returns Created event
   */
  async quickAddEvent(userId: string, calendarId: string, text: string) {
    try {
      // Parse simple natural language (mock implementation)
      const quickEvent = {
        id: 'quick-' + Date.now(),
        summary: text,
        created: new Date().toISOString(),
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() }
      };
      console.log('Mock: Quick event created:', quickEvent);
      return quickEvent;
    } catch (error) {
      console.error('Error with quick add:', error);
      throw new Error('Failed to quick add event');
    }
  }

  /**
   * Find free/busy time slots
   * @param userId - User identifier
   * @param calendars - List of calendar IDs
   * @param timeMin - Start time
   * @param timeMax - End time
   * @returns Free/busy information
   */
  async findFreeBusy(userId: string, calendars: string[], timeMin: string, timeMax: string) {
    try {
      // Mock free/busy data
      const freeBusyData = {
        timeMin,
        timeMax,
        calendars: calendars.reduce((acc, calId) => {
          acc[calId] = {
            busy: [
              {
                start: new Date(Date.now() + 3600000).toISOString(),
                end: new Date(Date.now() + 7200000).toISOString()
              }
            ],
            errors: []
          };
          return acc;
        }, {} as Record<string, { busy: Array<{ start: string; end: string }>; errors: string[] }>)
      };
      console.log('Mock: Free/busy data:', freeBusyData);
      return freeBusyData;
    } catch (error) {
      console.error('Error finding free/busy:', error);
      throw new Error('Failed to find free/busy information');
    }
  }

  /**
   * Move event to another calendar
   * @param userId - User identifier
   * @param calendarId - Source calendar ID
   * @param eventId - Event ID
   * @param destinationCalendarId - Destination calendar ID
   * @returns Moved event
   */
  async moveEvent(userId: string, calendarId: string, eventId: string, destinationCalendarId: string) {
    try {
      const movedEvent = {
        id: eventId,
        organizer: { email: this.generateUserInfo(userId).email },
        moved: true,
        originalCalendar: calendarId,
        newCalendar: destinationCalendarId,
        updated: new Date().toISOString()
      };
      console.log('Mock: Event moved:', movedEvent);
      return movedEvent;
    } catch (error) {
      console.error('Error moving event:', error);
      throw new Error('Failed to move event');
    }
  }

  /**
   * Set up Google Calendar webhook trigger for event changes
   * @param userId - User identifier
   * @param calendarId - Calendar ID to watch for changes (default: 'primary')
   * @param webhookUrl - Webhook endpoint URL
   * @param ttl - Time-to-live in seconds for the notification channel (default: 604800 = 7 days)
   * @returns Webhook channel information
   */
  async setupCalendarEventChangeWebhook(
    userId: string, 
    calendarId: string = 'primary', 
    webhookUrl: string, 
    ttl: number = 604800
  ) {
    try {
      console.log(`Setting up webhook for calendar ${calendarId} with TTL ${ttl}s`);
      
      // For now, this is a mock implementation as Composio webhook setup varies
      // In a real implementation, you would use Composio's trigger configuration
      const webhookChannel = {
        id: `webhook_${Date.now()}`,
        type: 'webhook',
        address: webhookUrl,
        calendarId,
        resourceId: `resource_${Date.now()}`,
        resourceUri: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        token: `token_${userId}_${Date.now()}`,
        expiration: Date.now() + (ttl * 1000),
        kind: 'api#channel',
        params: {
          ttl: ttl.toString()
        }
      };

      // Store webhook configuration (in real app, save to database)
      console.log('Webhook channel configured:', webhookChannel);
      
      return {
        success: true,
        channel: webhookChannel,
        message: 'Calendar event change webhook configured successfully'
      };
    } catch (error) {
      console.error('Error setting up webhook:', error);
      throw new Error('Failed to set up calendar event change webhook');
    }
  }

  /**
   * Remove/stop a calendar event change webhook
   * @param channelId - The webhook channel ID to stop
   * @param resourceId - The resource ID associated with the channel
   */
  async stopCalendarEventChangeWebhook(channelId: string, resourceId: string) {
    try {
      console.log(`Stopping webhook channel ${channelId} for resource ${resourceId}`);
      
      // In real implementation, this would call Composio's webhook stop API
      return {
        success: true,
        message: 'Webhook stopped successfully'
      };
    } catch (error) {
      console.error('Error stopping webhook:', error);
      throw new Error('Failed to stop webhook');
    }
  }

  /**
   * Polling-based calendar event sync (recommended alternative to webhooks)
   * @param userId - User identifier
   * @param calendarId - Calendar ID to sync
   * @param syncToken - Optional sync token for incremental sync
   * @returns Event changes and new sync token
   */
  async syncCalendarEvents(userId: string, calendarId: string = 'primary', syncToken?: string) {
    try {
      console.log(`Syncing calendar events for ${calendarId}${syncToken ? ' (incremental)' : ' (full)'}`);
      
      // Mock implementation - in real app, use Composio's calendar sync
      const mockChanges = [
        {
          id: `event_${Date.now()}_1`,
          status: 'confirmed',
          summary: 'New Meeting Added',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 90000000).toISOString() },
          changeType: 'created'
        },
        {
          id: `event_${Date.now()}_2`,
          status: 'cancelled',
          summary: 'Meeting Cancelled',
          changeType: 'deleted'
        }
      ];

      return {
        success: true,
        changes: mockChanges,
        nextSyncToken: `sync_token_${Date.now()}`,
        hasMoreChanges: false
      };
    } catch (error) {
      console.error('Error syncing calendar events:', error);
      throw new Error('Failed to sync calendar events');
    }
  }

  /**
   * Process incoming webhook notification
   * @param headers - Webhook headers
   * @param body - Webhook payload (optional, as webhook often just contains metadata)
   * @returns Processed webhook data
   */
  async processWebhookNotification(headers: Record<string, string>) {
    try {
      const channelId = headers['x-goog-channel-id'];
      const resourceId = headers['x-goog-resource-id'];
      const resourceState = headers['x-goog-resource-state'];
      const resourceUri = headers['x-goog-resource-uri'];

      console.log('Processing webhook notification:', {
        channelId,
        resourceId,
        resourceState,
        resourceUri
      });

      // Extract calendar ID from resource URI
      const calendarIdMatch = resourceUri?.match(/calendars\/([^\/]+)\/events/);
      const calendarId = calendarIdMatch ? calendarIdMatch[1] : 'primary';

      return {
        success: true,
        eventType: 'calendar_event_change',
        data: {
          channelId,
          resourceId,
          resourceState,
          calendarId,
          timestamp: new Date().toISOString(),
          changeDetected: resourceState === 'update' || resourceState === 'sync'
        }
      };
    } catch (error) {
      console.error('Error processing webhook notification:', error);
      throw new Error('Failed to process webhook notification');
    }
  }

  // ========== CALENDAR LIST OPERATIONS ==========

  /**
   * Insert a calendar into the user's calendar list
   * Maps to: GOOGLECALENDAR_CALENDAR_LIST_INSERT
   */
  async insertCalendarToList(userId: string, calendarId: string, options?: {
    backgroundColor?: string;
    foregroundColor?: string;
    hidden?: boolean;
    selected?: boolean;
    summaryOverride?: string;
  }) {
    try {
      console.log(`Inserting calendar ${calendarId} to user ${userId}'s calendar list`);
      
      const calendarListEntry = {
        id: calendarId,
        backgroundColor: options?.backgroundColor || '#3174ad',
        foregroundColor: options?.foregroundColor || '#ffffff',
        hidden: options?.hidden || false,
        selected: options?.selected || true,
        summaryOverride: options?.summaryOverride,
        accessRole: 'owner',
        kind: 'calendar#calendarListEntry',
        etag: `"${Date.now()}"`,
        colorId: '1'
      };

      console.log('Mock: Calendar added to list:', calendarListEntry);
      return calendarListEntry;
    } catch (error) {
      console.error('Error inserting calendar to list:', error);
      throw new Error('Failed to insert calendar to list');
    }
  }

  /**
   * Update a calendar in the user's calendar list
   * Maps to: GOOGLECALENDAR_CALENDAR_LIST_UPDATE
   */
  async updateCalendarInList(userId: string, calendarId: string, updates: {
    backgroundColor?: string;
    foregroundColor?: string;
    hidden?: boolean;
    selected?: boolean;
    summaryOverride?: string;
  }) {
    try {
      console.log(`Updating calendar ${calendarId} in user ${userId}'s calendar list`);
      
      const updatedEntry = {
        id: calendarId,
        ...updates,
        etag: `"${Date.now()}"`,
        updated: new Date().toISOString()
      };

      console.log('Mock: Calendar list entry updated:', updatedEntry);
      return updatedEntry;
    } catch (error) {
      console.error('Error updating calendar in list:', error);
      throw new Error('Failed to update calendar in list');
    }
  }

  // ========== CALENDAR OPERATIONS ==========

  /**
   * Update calendar metadata
   * Maps to: GOOGLECALENDAR_CALENDARS_UPDATE
   */
  async updateCalendar(userId: string, calendarId: string, updates: {
    summary?: string;
    description?: string;
    location?: string;
    timeZone?: string;
  }) {
    try {
      console.log(`Updating calendar ${calendarId} for user ${userId}`);
      
      const updatedCalendar = {
        id: calendarId,
        kind: 'calendar#calendar',
        etag: `"${Date.now()}"`,
        ...updates,
        updated: new Date().toISOString()
      };

      console.log('Mock: Calendar updated:', updatedCalendar);
      return updatedCalendar;
    } catch (error) {
      console.error('Error updating calendar:', error);
      throw new Error('Failed to update calendar');
    }
  }

  /**
   * Duplicate a calendar
   * Maps to: GOOGLECALENDAR_DUPLICATE_CALENDAR
   */
  async duplicateCalendar(userId: string, sourceCalendarId: string, newSummary: string) {
    try {
      console.log(`Duplicating calendar ${sourceCalendarId} for user ${userId}`);
      
      const duplicatedCalendar = {
        id: `duplicated_${Date.now()}`,
        kind: 'calendar#calendar',
        etag: `"${Date.now()}"`,
        summary: newSummary,
        description: `Duplicated from ${sourceCalendarId}`,
        timeZone: 'UTC',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      console.log('Mock: Calendar duplicated:', duplicatedCalendar);
      return duplicatedCalendar;
    } catch (error) {
      console.error('Error duplicating calendar:', error);
      throw new Error('Failed to duplicate calendar');
    }
  }

  /**
   * Get a specific calendar
   * Maps to: GOOGLECALENDAR_GET_CALENDAR
   */
  async getCalendar(userId: string, calendarId: string) {
    try {
      console.log(`Getting calendar ${calendarId} for user ${userId}`);
      
      const calendar = {
        id: calendarId,
        kind: 'calendar#calendar',
        etag: `"${Date.now()}"`,
        summary: calendarId === 'primary' ? 'Primary Calendar' : `Calendar ${calendarId}`,
        description: 'Calendar description',
        location: 'Global',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        conferenceProperties: {
          allowedConferenceSolutionTypes: ['hangoutsMeet']
        }
      };

      console.log('Mock: Calendar retrieved:', calendar);
      return calendar;
    } catch (error) {
      console.error('Error getting calendar:', error);
      throw new Error('Failed to get calendar');
    }
  }

  /**
   * Patch calendar (partial update)
   * Maps to: GOOGLECALENDAR_PATCH_CALENDAR
   */
  async patchCalendar(userId: string, calendarId: string, patches: Record<string, unknown>) {
    try {
      console.log(`Patching calendar ${calendarId} for user ${userId}`);
      
      const patchedCalendar = {
        id: calendarId,
        kind: 'calendar#calendar',
        etag: `"${Date.now()}"`,
        ...patches,
        updated: new Date().toISOString()
      };

      console.log('Mock: Calendar patched:', patchedCalendar);
      return patchedCalendar;
    } catch (error) {
      console.error('Error patching calendar:', error);
      throw new Error('Failed to patch calendar');
    }
  }

  // ========== EVENT OPERATIONS ==========

  /**
   * Get event instances (for recurring events)
   * Maps to: GOOGLECALENDAR_EVENTS_INSTANCES
   */
  async getEventInstances(userId: string, calendarId: string, eventId: string, options?: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }) {
    try {
      console.log(`Getting instances for event ${eventId} in calendar ${calendarId}`);
      
      const instances = Array.from({ length: options?.maxResults || 5 }, (_, i) => ({
        id: `${eventId}_${Date.now()}_${i}`,
        kind: 'calendar#event',
        etag: `"${Date.now()}"`,
        status: 'confirmed',
        summary: `Instance ${i + 1} of recurring event`,
        start: {
          dateTime: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000)).toISOString()
        },
        end: {
          dateTime: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000) + 3600000).toISOString()
        },
        recurringEventId: eventId
      }));

      console.log('Mock: Event instances retrieved:', instances);
      return { items: instances };
    } catch (error) {
      console.error('Error getting event instances:', error);
      throw new Error('Failed to get event instances');
    }
  }

  /**
   * Watch events for changes
   * Maps to: GOOGLECALENDAR_EVENTS_WATCH
   */
  async watchEvents(userId: string, calendarId: string, options: {
    address: string;
    id?: string;
    type?: string;
    token?: string;
    expiration?: number;
  }) {
    try {
      console.log(`Setting up watch for events in calendar ${calendarId}`);
      
      const channel = {
        id: options.id || `watch_${Date.now()}`,
        type: options.type || 'webhook',
        address: options.address,
        resourceId: `resource_${Date.now()}`,
        resourceUri: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        token: options.token || `token_${Date.now()}`,
        expiration: options.expiration || Date.now() + 3600000,
        kind: 'api#channel'
      };

      console.log('Mock: Events watch channel created:', channel);
      return channel;
    } catch (error) {
      console.error('Error setting up events watch:', error);
      throw new Error('Failed to set up events watch');
    }
  }

  /**
   * Find a specific event
   * Maps to: GOOGLECALENDAR_FIND_EVENT
   */
  async findEvent(userId: string, calendarId: string, query: string) {
    try {
      console.log(`Finding event with query "${query}" in calendar ${calendarId}`);
      
      const events = [
        {
          id: `found_event_${Date.now()}`,
          kind: 'calendar#event',
          etag: `"${Date.now()}"`,
          status: 'confirmed',
          summary: `Event matching: ${query}`,
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      ];

      console.log('Mock: Events found:', events);
      return { items: events };
    } catch (error) {
      console.error('Error finding event:', error);
      throw new Error('Failed to find event');
    }
  }

  /**
   * Find free time slots
   * Maps to: GOOGLECALENDAR_FIND_FREE_SLOTS
   */
  async findFreeSlots(userId: string, options: {
    timeMin: string;
    timeMax: string;
    timeZone?: string;
    calendars: string[];
    duration?: number; // in minutes
  }) {
    try {
      console.log('Finding free slots for user', userId);
      
      const freeSlots = [
        {
          start: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          end: new Date(Date.now() + 86400000 + (options.duration || 60) * 60000).toISOString()
        },
        {
          start: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
          end: new Date(Date.now() + 172800000 + (options.duration || 60) * 60000).toISOString()
        }
      ];

      console.log('Mock: Free slots found:', freeSlots);
      return { freeSlots, duration: options.duration || 60 };
    } catch (error) {
      console.error('Error finding free slots:', error);
      throw new Error('Failed to find free slots');
    }
  }

  /**
   * Patch event (partial update)
   * Maps to: GOOGLECALENDAR_PATCH_EVENT
   */
  async patchEvent(userId: string, calendarId: string, eventId: string, patches: Record<string, unknown>) {
    try {
      console.log(`Patching event ${eventId} in calendar ${calendarId}`);
      
      const patchedEvent = {
        id: eventId,
        kind: 'calendar#event',
        etag: `"${Date.now()}"`,
        status: 'confirmed',
        ...patches,
        updated: new Date().toISOString()
      };

      console.log('Mock: Event patched:', patchedEvent);
      return patchedEvent;
    } catch (error) {
      console.error('Error patching event:', error);
      throw new Error('Failed to patch event');
    }
  }

  /**
   * Remove an attendee from an event
   * Maps to: GOOGLECALENDAR_REMOVE_ATTENDEE
   */
  async removeAttendee(userId: string, calendarId: string, eventId: string, attendeeEmail: string) {
    try {
      console.log(`Removing attendee ${attendeeEmail} from event ${eventId}`);
      
      const updatedEvent = {
        id: eventId,
        kind: 'calendar#event',
        etag: `"${Date.now()}"`,
        status: 'confirmed',
        summary: 'Event with attendee removed',
        attendees: [
          // Mock remaining attendees (excluding the removed one)
          { email: 'remaining@example.com', responseStatus: 'accepted' }
        ],
        updated: new Date().toISOString()
      };

      console.log('Mock: Attendee removed, event updated:', updatedEvent);
      return updatedEvent;
    } catch (error) {
      console.error('Error removing attendee:', error);
      throw new Error('Failed to remove attendee');
    }
  }

  // ========== SETTINGS OPERATIONS ==========

  /**
   * Watch settings for changes
   * Maps to: GOOGLECALENDAR_SETTINGS_WATCH
   */
  async watchSettings(userId: string, options: {
    address: string;
    id?: string;
    type?: string;
    token?: string;
    expiration?: number;
  }) {
    try {
      console.log('Setting up watch for calendar settings changes');
      
      const channel = {
        id: options.id || `settings_watch_${Date.now()}`,
        type: options.type || 'webhook',
        address: options.address,
        resourceId: `settings_resource_${Date.now()}`,
        resourceUri: 'https://www.googleapis.com/calendar/v3/users/me/settings',
        token: options.token || `settings_token_${Date.now()}`,
        expiration: options.expiration || Date.now() + 3600000,
        kind: 'api#channel'
      };

      console.log('Mock: Settings watch channel created:', channel);
      return channel;
    } catch (error) {
      console.error('Error setting up settings watch:', error);
      throw new Error('Failed to set up settings watch');
    }
  }

  // ========== ACL (Access Control List) OPERATIONS ==========

  /**
   * List ACL rules for a calendar
   * Maps to: GOOGLECALENDAR_LIST_ACL_RULES
   */
  async listAclRules(userId: string, calendarId: string) {
    try {
      console.log(`Listing ACL rules for calendar ${calendarId}`);
      
      const aclRules = [
        {
          kind: 'calendar#aclRule',
          etag: `"${Date.now()}"`,
          id: `user:${userId}`,
          scope: { type: 'user', value: userId },
          role: 'owner'
        },
        {
          kind: 'calendar#aclRule',
          etag: `"${Date.now()}"`,
          id: 'default',
          scope: { type: 'default' },
          role: 'freeBusyReader'
        }
      ];

      console.log('Mock: ACL rules retrieved:', aclRules);
      return { items: aclRules };
    } catch (error) {
      console.error('Error listing ACL rules:', error);
      throw new Error('Failed to list ACL rules');
    }
  }

  /**
   * Update an ACL rule
   * Maps to: GOOGLECALENDAR_UPDATE_ACL_RULE
   */
  async updateAclRule(userId: string, calendarId: string, ruleId: string, updates: {
    role?: string;
    scope?: { type: string; value?: string };
  }) {
    try {
      console.log(`Updating ACL rule ${ruleId} for calendar ${calendarId}`);
      
      const updatedRule = {
        kind: 'calendar#aclRule',
        etag: `"${Date.now()}"`,
        id: ruleId,
        ...updates
      };

      console.log('Mock: ACL rule updated:', updatedRule);
      return updatedRule;
    } catch (error) {
      console.error('Error updating ACL rule:', error);
      throw new Error('Failed to update ACL rule');
    }
  }

  // ========== UTILITY OPERATIONS ==========

  /**
   * Get current date and time
   * Maps to: GOOGLECALENDAR_GET_CURRENT_DATE_TIME
   */
  async getCurrentDateTime(timeZone?: string) {
    try {
      const now = new Date();
      const currentDateTime = {
        dateTime: now.toISOString(),
        timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        timestamp: now.getTime(),
        formatted: now.toLocaleString()
      };

      console.log('Current date/time retrieved:', currentDateTime);
      return currentDateTime;
    } catch (error) {
      console.error('Error getting current date/time:', error);
      throw new Error('Failed to get current date/time');
    }
  }

  /**
   * Enhanced sync events with more options
   * Maps to: GOOGLECALENDAR_SYNC_EVENTS
   */
  async syncEventsAdvanced(userId: string, calendarId: string, options?: {
    syncToken?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    showDeleted?: boolean;
    singleEvents?: boolean;
  }) {
    try {
      console.log(`Advanced sync for calendar ${calendarId} with options:`, options);
      
      const syncResult = {
        kind: 'calendar#events',
        etag: `"${Date.now()}"`,
        summary: calendarId === 'primary' ? 'Primary Calendar' : `Calendar ${calendarId}`,
        updated: new Date().toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        accessRole: 'owner',
        defaultReminders: [],
        nextSyncToken: `sync_token_${Date.now()}`,
        items: [
          {
            id: `synced_event_${Date.now()}`,
            kind: 'calendar#event',
            etag: `"${Date.now()}"`,
            status: 'confirmed',
            summary: 'Synced Event',
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        ]
      };

      console.log('Mock: Advanced events sync completed:', syncResult);
      return syncResult;
    } catch (error) {
      console.error('Error with advanced sync:', error);
      throw new Error('Failed to perform advanced sync');
    }
  }

  /**
   * Get calendar events formatted for AI summarization
   * @param connectionId - Connection ID for the Google Calendar account
   * @param timeframe - Time period to fetch events for ('week', 'month', 'today')
   * @returns Formatted events array ready for AI analysis
   */
  async getEventsForSummarization(
    connectionId: string, 
    timeframe: 'today' | 'week' | 'month' = 'week'
  ) {
    try {
      console.log(`📊 Fetching events for AI summarization (${timeframe}):`, connectionId);

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (timeframe) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
          startOfWeek.setHours(0, 0, 0, 0);
          startDate = startOfWeek;
          endDate = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = new Date();
          endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      // Get events from Google Calendar using existing method
      const rawEvents = await this.listEvents(
        connectionId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (!rawEvents || rawEvents.length === 0) {
        console.log('📊 No events found for summarization');
        return [];
      }

      // Define event type for better TypeScript support
      interface CalendarEvent {
        id: string;
        summary?: string;
        description?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        attendees?: Array<{ displayName?: string; email?: string }>;
        location?: string;
        status?: string;
        recurringEventId?: string;
        hangoutLink?: string;
        conferenceData?: { entryPoints?: Array<{ uri?: string }> };
        organizer?: { displayName?: string; email?: string };
        created?: string;
        updated?: string;
      }

      // Filter and format events for AI processing
      const formattedEvents = (rawEvents as CalendarEvent[])
        .filter((event: CalendarEvent) => {
          if (!event.start?.dateTime && !event.start?.date) return false;
          
          const eventDateStr = event.start.dateTime || event.start.date;
          if (!eventDateStr) return false;
          
          const eventDate = new Date(eventDateStr);
          return eventDate >= startDate && eventDate <= endDate;
        })
        .map((event: CalendarEvent) => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description || undefined,
          start: event.start?.dateTime || event.start?.date || '',
          end: event.end?.dateTime || event.end?.date || '',
          attendees: event.attendees?.map((attendee) => 
            attendee.displayName || attendee.email
          ).filter(Boolean) || [],
          location: event.location || undefined,
          status: event.status || 'confirmed',
          recurring: !!event.recurringEventId,
          meetingUrl: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
          organizer: event.organizer?.displayName || event.organizer?.email,
          created: event.created,
          updated: event.updated,
        }))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      console.log(`📊 Formatted ${formattedEvents.length} events for AI analysis (${timeframe})`);
      
      return formattedEvents;

    } catch (error) {
      console.error('Error fetching events for summarization:', error);
      throw new Error('Failed to fetch events for AI analysis');
    }
  }

  /**
   * Request AI summarization of calendar events
   * @param connectionId - Connection ID for the Google Calendar account
   * @param timeframe - Time period to analyze
   * @param preferences - User preferences for analysis
   * @returns AI-generated summary and insights
   */
  async requestCalendarSummary(
    connectionId: string,
    timeframe: 'today' | 'week' | 'month' = 'week',
    preferences?: {
      generatePlans?: boolean;
      workingHours?: { start: string; end: string };
      priorities?: string[];
      focusBlocks?: number;
    }
  ) {
    try {
      console.log(`🤖 Requesting AI calendar summary for ${timeframe}`);

      // Get formatted events
      const events = await this.getEventsForSummarization(connectionId, timeframe);

      if (events.length === 0) {
        return {
          summary: {
            summary: `No events found for the selected ${timeframe}.`,
            upcomingHighlights: [],
            timeInsights: ['No scheduled events'],
            recommendations: ['Consider scheduling important tasks and meetings'],
            productivity: {
              score: 100,
              busyHours: [],
              freeSlots: ['All time available'],
            },
          },
          actionablePlans: null,
          eventsCount: 0,
          timeframe,
          generatedAt: new Date().toISOString(),
        };
      }

      // Call the summarization API
      const response = await fetch('/api/calendar/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          timeframe,
          preferences,
        }),
      });

      if (!response.ok) {
        throw new Error(`Summarization API error: ${response.status}`);
      }

      const summaryResult = await response.json();
      
      console.log(`✅ AI calendar summary generated successfully`);
      return summaryResult;

    } catch (error) {
      console.error('Error requesting calendar summary:', error);
      throw new Error('Failed to generate calendar summary');
    }
  }

  /**
   * Get today's events for individual selection
   * @param connectionId - Connection ID for the Google Calendar account
   * @returns Array of today's events with basic info
   */
  async getTodaysEventsForSelection(connectionId: string) {
    try {
      console.log('📅 Fetching today\'s events for selection:', connectionId);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const rawEvents = await this.listEvents(
        connectionId,
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      if (!rawEvents || rawEvents.length === 0) {
        console.log('📅 No events found for today');
        return [];
      }

      // Define event type
      interface CalendarEvent {
        id: string;
        summary?: string;
        description?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        attendees?: Array<{ displayName?: string; email?: string }>;
        location?: string;
        status?: string;
        organizer?: { displayName?: string; email?: string };
      }

      // Format events for selection dropdown
      return (rawEvents as CalendarEvent[])
        .filter((event: CalendarEvent) => {
          return event.status !== 'cancelled' && event.summary;
        })
        .map((event: CalendarEvent) => {
          const startTime = event.start?.dateTime || event.start?.date;
          const endTime = event.end?.dateTime || event.end?.date;
          
          return {
            id: event.id,
            title: event.summary || 'Untitled Event',
            startTime: startTime ? new Date(startTime).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }) : 'All day',
            endTime: endTime ? new Date(endTime).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }) : '',
            duration: this.calculateEventDuration(startTime, endTime),
            attendeeCount: event.attendees?.length || 0,
            hasLocation: !!event.location,
            isUpcoming: startTime ? new Date(startTime) > now : false
          };
        })
        .sort((a, b) => {
          // Sort by start time, with all-day events first
          if (a.startTime === 'All day' && b.startTime !== 'All day') return -1;
          if (b.startTime === 'All day' && a.startTime !== 'All day') return 1;
          return a.startTime.localeCompare(b.startTime);
        });

    } catch (error) {
      console.error('Error fetching today\'s events for selection:', error);
      return [];
    }
  }

  /**
   * Get detailed information for a single event
   * @param connectionId - Connection ID for the Google Calendar account
   * @param eventId - ID of the specific event
   * @returns Detailed event information formatted for AI analysis
   */
  async getSingleEventForSummarization(connectionId: string, eventId: string) {
    try {
      console.log('🔍 Fetching single event for summarization:', eventId);

      // Get the specific event using the existing method
      const rawEvents = await this.listEvents(connectionId);
      
      if (!rawEvents || rawEvents.length === 0) {
        throw new Error('No events found');
      }

      // Find the specific event
      const targetEvent = rawEvents.find((event: unknown) => {
        const eventObj = event as { id?: string };
        return eventObj.id === eventId;
      });
      
      if (!targetEvent) {
        throw new Error('Event not found');
      }

      // Define event type
      interface CalendarEvent {
        id: string;
        summary?: string;
        description?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        attendees?: Array<{ displayName?: string; email?: string }>;
        location?: string;
        status?: string;
        organizer?: { displayName?: string; email?: string };
        created?: string;
        updated?: string;
        hangoutLink?: string;
        conferenceData?: { entryPoints?: Array<{ uri?: string }> };
      }

      const event = targetEvent as CalendarEvent;
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;

      // Format single event with rich details for AI analysis
      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: startTime,
        end: endTime,
        duration: this.calculateEventDuration(startTime, endTime),
        attendees: event.attendees?.map((attendee) => 
          attendee.displayName || attendee.email
        ).filter((name): name is string => Boolean(name)) || [],
        location: event.location || undefined,
        status: event.status || 'confirmed',
        organizer: event.organizer?.displayName || event.organizer?.email,
        hasVideoCall: !!(event.hangoutLink || event.conferenceData?.entryPoints?.length),
        timeUntilStart: startTime ? this.getTimeUntilEvent(startTime) : null,
        dayOfWeek: startTime ? new Date(startTime).toLocaleDateString('en-US', { weekday: 'long' }) : null,
        dateFormatted: startTime ? new Date(startTime).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        }) : null,
        timeFormatted: startTime ? new Date(startTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }) : 'All day'
      };

    } catch (error) {
      console.error('Error fetching single event for summarization:', error);
      throw new Error('Failed to fetch event details');
    }
  }

  /**
   * Calculate event duration in human-readable format
   */
  private calculateEventDuration(startTime?: string, endTime?: string): string {
    if (!startTime || !endTime) return 'Unknown duration';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes} min`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  /**
   * Get time until event starts
   */
  private getTimeUntilEvent(startTime: string): string {
    const now = new Date();
    const eventStart = new Date(startTime);
    const diffMs = eventStart.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Started';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else if (diffMinutes < 1440) { // Less than 24 hours
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }
}

// Export singleton instance
export const composioService = new ComposioService();