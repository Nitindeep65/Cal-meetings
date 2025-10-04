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

    const stats = await calendarService.getCalendarStats(
      startDate || undefined,
      endDate || undefined
    )

    return NextResponse.json({ 
      success: true, 
      stats 
    })
  } catch (error) {
    console.error('Calendar stats API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch calendar stats' 
      },
      { status: 500 }
    )
  }
}