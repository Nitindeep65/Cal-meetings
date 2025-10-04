import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { calendarService } from '@/lib/calendar-service'
import { geminiService } from '@/lib/gemini-ai'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize Gemini with server-side API key
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (geminiApiKey) {
      await geminiService.initialize(geminiApiKey)
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const events = await calendarService.getEvents(
      startDate || undefined,
      endDate || undefined
    )

    return NextResponse.json({ 
      success: true, 
      events,
      hasAI: calendarService.hasAI 
    })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch calendar events' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize Gemini with server-side API key
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (geminiApiKey) {
      await geminiService.initialize(geminiApiKey)
    }

    const eventData = await request.json()
    const createdEvent = await calendarService.createEvent(eventData)

    return NextResponse.json({ 
      success: true, 
      event: createdEvent 
    })
  } catch (error) {
    console.error('Calendar create API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create calendar event' 
      },
      { status: 500 }
    )
  }
}