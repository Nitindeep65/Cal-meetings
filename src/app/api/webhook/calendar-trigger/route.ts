import { NextRequest, NextResponse } from 'next/server';
import { composioService } from '@/lib/composio-service';

/**
 * Manage Google Calendar webhook triggers
 * POST: Setup a new webhook trigger
 * DELETE: Stop an existing webhook trigger
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      calendarId = 'primary', 
      webhookUrl, 
      ttl = 604800 // 7 days default
    } = body;

    // Validate required fields
    if (!userId || !webhookUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and webhookUrl are required' },
        { status: 400 }
      );
    }

    // Validate webhook URL
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

    // Validate TTL (max 7 days for Google Calendar)
    if (ttl > 604800 || ttl < 1) {
      return NextResponse.json(
        { error: 'TTL must be between 1 and 604800 seconds (7 days)' },
        { status: 400 }
      );
    }

    // Setup the webhook trigger
    const result = await composioService.setupCalendarEventChangeWebhook(
      userId,
      calendarId,
      webhookUrl,
      ttl
    );

    return NextResponse.json({
      success: true,
      message: 'Calendar event change webhook configured successfully',
      data: result
    });

  } catch (error) {
    console.error('Error setting up calendar webhook:', error);
    return NextResponse.json(
      { 
        error: 'Failed to setup webhook trigger',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, resourceId } = body;

    // Validate required fields
    if (!channelId || !resourceId) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId and resourceId are required' },
        { status: 400 }
      );
    }

    // Stop the webhook
    const result = await composioService.stopCalendarEventChangeWebhook(channelId, resourceId);

    return NextResponse.json({
      success: true,
      message: 'Webhook stopped successfully',
      data: result
    });

  } catch (error) {
    console.error('Error stopping calendar webhook:', error);
    return NextResponse.json(
      { 
        error: 'Failed to stop webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/webhook/calendar-trigger',
    description: 'Manage Google Calendar event change webhooks',
    methods: {
      POST: {
        description: 'Setup a new webhook trigger',
        body: {
          userId: 'string (required)',
          calendarId: 'string (optional, defaults to "primary")',
          webhookUrl: 'string (required)',
          ttl: 'number (optional, defaults to 604800 seconds / 7 days)'
        }
      },
      DELETE: {
        description: 'Stop an existing webhook trigger',
        body: {
          channelId: 'string (required)',
          resourceId: 'string (required)'
        }
      }
    },
    notes: [
      'Webhooks are soon to be deprecated - consider using the polling sync API instead',
      'TTL maximum is 604800 seconds (7 days)',
      'Webhook URL must be publicly accessible and use HTTPS'
    ]
  });
}