import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { googleCalendarService } from '@/lib/google-calendar-service'

interface SessionWithAccessToken {
  accessToken?: string;
  user?: {
    name?: string;
    email?: string;
    image?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession() as SessionWithAccessToken | null
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const startDate = url.searchParams.get('startDate') || undefined
    const endDate = url.searchParams.get('endDate') || undefined

    const events = await googleCalendarService.getEvents(session.accessToken, startDate, endDate)
    return NextResponse.json({ success: true, events })
  } catch (error: unknown) {
    const err = error as Error
    console.error('Failed to fetch calendar events:', err.message, err.stack)
    // In development, return empty array so UI can render without breaking
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ success: true, events: [] })
    }

    return NextResponse.json({ error: 'Failed to fetch calendar events', message: err.message }, { status: 500 })
  }
}
