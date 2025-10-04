import { NextRequest, NextResponse } from 'next/server';
import { composioService } from '@/lib/composio-service';

/**
 * Handle Google Calendar webhook notifications for event changes
 * This endpoint receives real-time notifications when calendar events change
 */
export async function POST(request: NextRequest) {
  try {
    // Extract headers that Google Calendar sends with webhook notifications
    const headers = {
      'x-goog-channel-id': request.headers.get('x-goog-channel-id') || '',
      'x-goog-resource-id': request.headers.get('x-goog-resource-id') || '',
      'x-goog-resource-state': request.headers.get('x-goog-resource-state') || '',
      'x-goog-resource-uri': request.headers.get('x-goog-resource-uri') || '',
      'x-goog-channel-expiration': request.headers.get('x-goog-channel-expiration') || '',
      'x-goog-channel-token': request.headers.get('x-goog-channel-token') || '',
    };

    // Get request body (though it's often empty for calendar webhooks)
    let body;
    try {
      body = await request.json();
    } catch {
      // Body might be empty or not JSON, which is normal for calendar webhooks
      body = null;
    }

    console.log('Received calendar webhook notification:', {
      headers,
      body,
      url: request.url,
      method: request.method
    });

    // Validate required headers
    if (!headers['x-goog-channel-id'] || !headers['x-goog-resource-id']) {
      return NextResponse.json(
        { error: 'Invalid webhook notification - missing required headers' },
        { status: 400 }
      );
    }

    // Process the webhook notification
    const result = await composioService.processWebhookNotification(headers, body);

    // Handle different resource states
    const resourceState = headers['x-goog-resource-state'];
    
    switch (resourceState) {
      case 'sync':
        console.log('Calendar sync notification received');
        // Initial sync notification - can be ignored or used for setup
        break;
        
      case 'update':
        console.log('Calendar update notification received');
        // This is where you'd trigger real-time updates to your UI
        // You could use Server-Sent Events, WebSockets, or database updates
        await handleCalendarUpdate(result.data);
        break;
        
      case 'exists':
        console.log('Calendar exists notification received');
        // Resource exists notification
        break;
        
      default:
        console.log(`Unknown resource state: ${resourceState}`);
    }

    // Return success response (Google expects 2xx status)
    return NextResponse.json({
      success: true,
      message: 'Webhook notification processed successfully',
      channelId: headers['x-goog-channel-id'],
      resourceState: headers['x-goog-resource-state']
    });

  } catch (error) {
    console.error('Error processing calendar webhook:', error);
    
    // Still return 200 to prevent Google from retrying
    // Log the error for investigation
    return NextResponse.json({
      success: false,
      message: 'Error processing webhook notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 });
  }
}

/**
 * Handle GET requests for webhook verification
 * Google Calendar may send GET requests to verify the webhook endpoint
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get('hub.challenge');
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');

  console.log('Webhook verification request:', { challenge, mode, token });

  // If it's a verification request, return the challenge
  if (mode === 'subscribe' && challenge) {
    return new NextResponse(challenge);
  }

  // Return basic info about the webhook endpoint
  return NextResponse.json({
    endpoint: '/api/webhook/calendar-events',
    purpose: 'Google Calendar event change notifications',
    methods: ['POST', 'GET'],
    status: 'active'
  });
}

/**
 * Handle calendar update notifications
 * This function processes the actual calendar changes
 */
async function handleCalendarUpdate(webhookData: {
  calendarId: string;
  channelId: string;
  timestamp: string;
  resourceState?: string;
}) {
  try {
    const { calendarId, timestamp } = webhookData;
    
    console.log(`Processing calendar update for ${calendarId} at ${timestamp}`);
    
    // In a real application, you would:
    // 1. Fetch the latest events from the calendar to see what changed
    // 2. Update your local database with the changes
    // 3. Notify connected clients through WebSockets or Server-Sent Events
    // 4. Send push notifications to mobile apps
    // 5. Trigger any business logic that depends on calendar changes

    // Example: Fetch recent changes using the sync API
    // const userId = getUserIdFromChannelId(channelId);
    // const changes = await composioService.syncCalendarEvents(userId, calendarId);
    
    // Example: Broadcast to connected clients
    // await broadcastToClients({
    //   type: 'calendar_event_change',
    //   calendarId,
    //   timestamp,
    //   changes: changes.changes
    // });

    console.log('Calendar update processed successfully');
    
  } catch (error) {
    console.error('Error handling calendar update:', error);
    // Don't throw - we don't want to fail the webhook response
  }
}