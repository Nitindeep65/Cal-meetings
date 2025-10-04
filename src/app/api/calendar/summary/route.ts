import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { geminiService } from '@/lib/gemini-ai'

interface SessionWithAccessToken {
  accessToken?: string;
  user?: {
    name?: string;
    email?: string;
    image?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession() as SessionWithAccessToken | null
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { eventId, eventTitle, eventDescription, attendees } = await request.json()

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Initialize Gemini AI service
    await geminiService.initialize(process.env.GEMINI_API_KEY!)

    // Generate meeting summary using Gemini
    const summary = await geminiService.summarizeMeeting(
      eventTitle || 'Meeting',
      eventDescription,
      undefined, // No transcript available from Google Calendar
      attendees || []
    )

    return NextResponse.json({ 
      success: true, 
      summary,
      eventId 
    })
  } catch (error: unknown) {
    const err = error as Error
    console.error('Failed to generate meeting summary:', err.message)
    return NextResponse.json(
      { error: 'Failed to generate meeting summary', message: err.message }, 
      { status: 500 }
    )
  }
}