import { NextRequest, NextResponse } from 'next/server';
import { composioService } from '@/lib/composio-service';

/**
 * Calendar Event Sync API - Polling-based alternative to webhooks
 * This is the recommended approach as webhooks are being deprecated
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      calendarId = 'primary', 
      syncToken,
      maxResults = 250
    } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Validate maxResults
    if (maxResults > 2500 || maxResults < 1) {
      return NextResponse.json(
        { error: 'maxResults must be between 1 and 2500' },
        { status: 400 }
      );
    }

    // Perform calendar sync
    const result = await composioService.syncCalendarEvents(userId, calendarId, syncToken);

    return NextResponse.json({
      success: true,
      message: syncToken ? 'Incremental calendar sync completed' : 'Full calendar sync completed',
      data: {
        changes: result.changes,
        nextSyncToken: result.nextSyncToken,
        hasMoreChanges: result.hasMoreChanges,
        calendarId,
        syncType: syncToken ? 'incremental' : 'full',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error syncing calendar events:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync calendar events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const calendarId = searchParams.get('calendarId') || 'primary';
  const syncToken = searchParams.get('syncToken');

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing required parameter: userId' },
      { status: 400 }
    );
  }

  try {
    // Perform calendar sync via GET request
    const result = await composioService.syncCalendarEvents(userId, calendarId, syncToken || undefined);

    return NextResponse.json({
      success: true,
      message: syncToken ? 'Incremental calendar sync completed' : 'Full calendar sync completed',
      data: {
        changes: result.changes,
        nextSyncToken: result.nextSyncToken,
        hasMoreChanges: result.hasMoreChanges,
        calendarId,
        syncType: syncToken ? 'incremental' : 'full',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error syncing calendar events:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync calendar events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({
    endpoint: '/api/calendar/sync',
    description: 'Calendar Event Sync API - Recommended alternative to webhooks',
    methods: {
      GET: {
        description: 'Sync calendar events via query parameters',
        parameters: {
          userId: 'string (required)',
          calendarId: 'string (optional, defaults to "primary")',
          syncToken: 'string (optional, for incremental sync)'
        }
      },
      POST: {
        description: 'Sync calendar events via request body',
        body: {
          userId: 'string (required)',
          calendarId: 'string (optional, defaults to "primary")',
          syncToken: 'string (optional, for incremental sync)',
          maxResults: 'number (optional, defaults to 250, max 2500)'
        }
      }
    },
    usage: {
      polling: 'Call this endpoint periodically (every 1-5 minutes) to check for changes',
      incremental: 'Use the nextSyncToken from previous response for incremental updates',
      full: 'Omit syncToken for full calendar sync (first time or after errors)'
    },
    benefits: [
      'More reliable than webhooks',
      'No need for public endpoint',
      'Better error handling',
      'Recommended by Google as webhooks are being deprecated'
    ]
  });
}