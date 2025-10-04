import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const session = await getServerAuthSession() as SessionWithAccessToken | null
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const stats = await googleCalendarService.getStats(session.accessToken)
  return NextResponse.json({ success: true, stats })
  } catch (error: unknown) {
    const err = error as Error
    console.error('Failed to fetch calendar stats:', err.message, err.stack)
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ success: true, stats: { totalMeetings: 0, totalHours: 0, upcomingMeetings: 0, averageMeetingDuration: 0 } })
    }
    return NextResponse.json({ error: 'Failed to fetch calendar stats', message: err.message }, { status: 500 })
  }
}
