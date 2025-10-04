import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/gemini-ai';
import { composioService } from '@/lib/composio-service';

export async function POST(request: NextRequest) {
  try {
    // Get the Gemini API key from environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Initialize Gemini service
    await geminiService.initialize(geminiApiKey);

    const body = await request.json();
    const { connectionId, eventId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Analyzing single event: ${eventId} for connection: ${connectionId}`);

    // Get detailed event information
    const eventDetails = await composioService.getSingleEventForSummarization(connectionId, eventId);

    if (!eventDetails) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Analyze the single event with AI
    const analysis = await geminiService.analyzeSingleEvent(eventDetails);

    const response = {
      analysis,
      eventDetails,
      analyzedAt: new Date().toISOString(),
    };

    console.log(`✅ Successfully analyzed single event: ${eventDetails.title}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error analyzing single event:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to analyze event',
        details: 'Please check your connection and try again'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    console.log(`📅 Fetching today's events for selection: ${connectionId}`);

    // Get today's events for selection
    const todaysEvents = await composioService.getTodaysEventsForSelection(connectionId);

    const response = {
      events: todaysEvents,
      count: todaysEvents.length,
      date: new Date().toISOString().split('T')[0],
    };

    console.log(`✅ Found ${todaysEvents.length} events for today`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching today\'s events:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        details: 'Please check your connection and try again'
      },
      { status: 500 }
    );
  }
}