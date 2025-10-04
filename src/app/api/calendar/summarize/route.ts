import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/gemini-ai';

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
    const { events, timeframe = 'week', preferences } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Events array is required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Summarizing ${events.length} calendar events for ${timeframe}`);

    // Summarize calendar events
    const summary = await geminiService.summarizeCalendarEvents(events, timeframe);

    // Generate actionable plans if requested
    let actionablePlans = null;
    if (preferences?.generatePlans) {
      actionablePlans = await geminiService.generateActionablePlans(summary, preferences);
    }

    const response = {
      summary,
      actionablePlans,
      eventsCount: events.length,
      timeframe,
      generatedAt: new Date().toISOString(),
    };

    console.log(`✅ Successfully generated calendar summary with ${summary.recommendations.length} recommendations`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Calendar summarization error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to summarize calendar events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Calendar summarization endpoint',
      usage: 'POST with events array and optional timeframe and preferences'
    }
  );
}