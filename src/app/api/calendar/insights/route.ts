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

// Helper function to generate insights for upcoming meetings
async function generateUpcomingMeetingInsights(
  title: string, 
  description?: string, 
  attendees: string[] = []
) {
  // Use the existing summarizeMeeting method creatively for upcoming meetings
  const summary = await geminiService.summarizeMeeting(
    title,
    `UPCOMING MEETING PREPARATION - ${description || 'No description provided'}. Attendees: ${attendees.join(', ')}. Please provide preparation insights, suggested agenda items, and key questions instead of a typical meeting summary.`,
    undefined,
    attendees
  )
  
  // Transform the summary into preparation insights
  return {
    preparation: summary.keyPoints,
    suggestedAgenda: [`Discuss ${title}`, 'Review action items', 'Next steps'],
    keyQuestions: summary.actionItems,
    potentialChallenges: ['Time management', 'Decision making'],
    recommendations: [`Prepare materials for ${title}`, 'Share agenda in advance']
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession() as SessionWithAccessToken | null
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { eventTitle, eventDescription, attendees, isUpcoming } = await request.json()

    if (!eventTitle) {
      return NextResponse.json({ error: 'Event title is required' }, { status: 400 })
    }

    // Initialize Gemini AI service
    await geminiService.initialize(process.env.GEMINI_API_KEY!)

    let insights;
    
    if (isUpcoming) {
      // For upcoming meetings, generate preparation insights
      insights = await generateUpcomingMeetingInsights(eventTitle, eventDescription, attendees || [])
    } else {
      // For past meetings analysis, use existing method with mock data structure
      const mockMeetings = [{
        title: eventTitle,
        date: new Date().toISOString(),
        attendees: attendees || [],
        summary: undefined
      }]
      insights = await geminiService.generateMeetingInsights(mockMeetings)
    }

    return NextResponse.json({ 
      success: true, 
      insights 
    })
  } catch (error: unknown) {
    const err = error as Error
    console.error('Failed to generate meeting insights:', err.message)
    return NextResponse.json(
      { error: 'Failed to generate meeting insights', message: err.message }, 
      { status: 500 }
    )
  }
}