import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface MeetingSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  participants: string[];
  duration: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface MeetingTranscript {
  text: string;
  timestamp: string;
  speaker?: string;
}

class GeminiAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  constructor() {
    // Note: API key should be set server-side via API routes
    // This will be initialized when used from API routes
  }

  async initialize(apiKey: string) {
    if (!this.genAI && apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      
      // Try different model names in order of preference
      const modelNames = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-pro-latest', 'gemini-flash-latest'];
      
      let modelFound = false;
      for (const modelName of modelNames) {
        try {
          const testModel = this.genAI.getGenerativeModel({ model: modelName });
          // Test if model is accessible by making a simple request
          await testModel.generateContent('Test');
          this.model = testModel;
          modelFound = true;
          console.log(`Successfully connected to ${modelName}`);
          break;
        } catch (error) {
          console.log(`Model ${modelName} not available:`, error);
          continue;
        }
      }
      
      if (!modelFound) {
        console.error('No Gemini models available with current API key');
        // Fallback to basic model without testing
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      }
    }
  }

  private async generateContentWithRetry(prompt: string, maxRetries: number = 3) {
    if (!this.model) {
      throw new Error('Gemini model not initialized');
    }

    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        return result;
      } catch (error: unknown) {
        const errorObj = error as Error & { status?: number };
        lastError = errorObj;
        
        // Check if it's a rate limit error
        if (errorObj.status === 429 || errorObj.message?.includes('Too Many Requests')) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // For other errors or final attempt, throw immediately
        throw error;
      }
    }
    
    throw lastError!;
  }

  async summarizeMeeting(
    eventTitle: string,
    eventDescription?: string,
    transcript?: MeetingTranscript[],
    attendees?: string[]
  ): Promise<MeetingSummary> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Prepare context for the AI
      const context = {
        title: eventTitle,
        description: eventDescription || 'No description provided',
        attendees: attendees || [],
        transcript: transcript || [],
      };

      const prompt = `
        Please analyze this meeting and provide a comprehensive summary:

        Meeting Title: ${context.title}
        Description: ${context.description}
        Attendees: ${context.attendees.join(', ') || 'Not specified'}
        
        ${context.transcript.length > 0 ? `
        Transcript:
        ${context.transcript.map(t => `[${t.timestamp}] ${t.speaker || 'Speaker'}: ${t.text}`).join('\n')}
        ` : ''}

        Please provide a JSON response with the following structure:
        {
          "summary": "A concise summary of the meeting (2-3 sentences)",
          "keyPoints": ["Array of key discussion points"],
          "actionItems": ["Array of action items and next steps"],
          "participants": ["Array of active participants"],
          "duration": "Estimated or actual meeting duration",
          "sentiment": "positive|neutral|negative - overall meeting sentiment"
        }

        Focus on extracting actionable insights, key decisions, and next steps.
      `;

      const result = await this.generateContentWithRetry(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }

      const summaryData = JSON.parse(jsonMatch[0]);

      return {
        summary: summaryData.summary || 'Meeting summary not available',
        keyPoints: summaryData.keyPoints || [],
        actionItems: summaryData.actionItems || [],
        participants: summaryData.participants || attendees || [],
        duration: summaryData.duration || 'Unknown',
        sentiment: summaryData.sentiment || 'neutral',
      };
    } catch (error) {
      console.error('Failed to generate meeting summary:', error);
      
      // Return a fallback summary
      return {
        summary: `Meeting: ${eventTitle}. ${eventDescription || 'No additional details available.'}`,
        keyPoints: eventDescription ? [eventDescription] : [],
        actionItems: [],
        participants: attendees || [],
        duration: 'Unknown',
        sentiment: 'neutral',
      };
    }
  }

  async generateMeetingInsights(
    meetings: Array<{
      title: string;
      date: string;
      attendees: string[];
      summary?: MeetingSummary;
    }>
  ): Promise<{
    trends: string[];
    recommendations: string[];
    productivityScore: number;
  }> {
    if (!this.model || meetings.length === 0) {
      return {
        trends: [],
        recommendations: [],
        productivityScore: 0,
      };
    }

    try {
      const prompt = `
        Analyze these recent meetings and provide insights:

        ${meetings.map((meeting, index) => `
        Meeting ${index + 1}:
        - Title: ${meeting.title}
        - Date: ${meeting.date}
        - Attendees: ${meeting.attendees.join(', ')}
        - Summary: ${meeting.summary?.summary || 'No summary available'}
        - Key Points: ${meeting.summary?.keyPoints?.join(', ') || 'None'}
        - Action Items: ${meeting.summary?.actionItems?.join(', ') || 'None'}
        - Sentiment: ${meeting.summary?.sentiment || 'neutral'}
        `).join('\n')}

        Please provide a JSON response with:
        {
          "trends": ["Array of trends you notice across meetings"],
          "recommendations": ["Array of recommendations for better meeting management"],
          "productivityScore": number between 0-100 based on meeting effectiveness
        }
      `;

      const result = await this.generateContentWithRetry(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI insights response');
      }

      const insights = JSON.parse(jsonMatch[0]);

      return {
        trends: insights.trends || [],
        recommendations: insights.recommendations || [],
        productivityScore: insights.productivityScore || 0,
      };
    } catch (error) {
      console.error('Failed to generate meeting insights:', error);
      return {
        trends: ['Unable to analyze meeting trends'],
        recommendations: ['Consider reviewing meeting effectiveness'],
        productivityScore: 50,
      };
    }
  }

  async suggestMeetingImprovements(
    eventTitle: string,
    duration: string,
    attendees: string[],
    previousMeetings?: MeetingSummary[]
  ): Promise<{
    agenda: string[];
    timeAllocation: Record<string, string>;
    preparation: string[];
  }> {
    if (!this.model) {
      return {
        agenda: [],
        timeAllocation: {},
        preparation: [],
      };
    }

    try {
      const prompt = `
        Help improve this upcoming meeting:

        Meeting: ${eventTitle}
        Duration: ${duration}
        Attendees: ${attendees.join(', ')}
        
        ${previousMeetings && previousMeetings.length > 0 ? `
        Previous meeting patterns:
        ${previousMeetings.map(m => `
        - Key Points: ${m.keyPoints.join(', ')}
        - Action Items: ${m.actionItems.join(', ')}
        - Sentiment: ${m.sentiment}
        `).join('\n')}
        ` : ''}

        Provide a JSON response with:
        {
          "agenda": ["Suggested agenda items in order"],
          "timeAllocation": {"agenda_item": "time_estimate"},
          "preparation": ["Pre-meeting preparation suggestions"]
        }
      `;

      const result = await this.generateContentWithRetry(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse meeting suggestions response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to generate meeting suggestions:', error);
      return {
        agenda: ['Opening and introductions', 'Main discussion', 'Action items and next steps'],
        timeAllocation: {
          'Opening and introductions': '5 minutes',
          'Main discussion': '40 minutes',
          'Action items and next steps': '15 minutes',
        },
        preparation: ['Review previous meeting notes', 'Prepare discussion points', 'Share agenda in advance'],
      };
    }
  }

  async summarizeCalendarEvents(
    events: Array<{
      id: string;
      title: string;
      description?: string;
      start: string;
      end: string;
      attendees?: string[];
      location?: string;
      status?: string;
    }>,
    timeframe: string = 'week'
  ): Promise<{
    summary: string;
    upcomingHighlights: string[];
    timeInsights: string[];
    recommendations: string[];
    productivity: {
      score: number;
      busyHours: string[];
      freeSlots: string[];
    };
  }> {
    if (!this.model || events.length === 0) {
      return {
        summary: 'No events to summarize',
        upcomingHighlights: [],
        timeInsights: [],
        recommendations: [],
        productivity: {
          score: 0,
          busyHours: [],
          freeSlots: [],
        },
      };
    }

    try {
      // Sort events by start time
      const sortedEvents = events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      const prompt = `
        Analyze this calendar schedule for the ${timeframe} and provide insights:

        Calendar Events (${events.length} total):
        ${sortedEvents.map((event, index) => `
        ${index + 1}. ${event.title}
           - Time: ${new Date(event.start).toLocaleString()} - ${new Date(event.end).toLocaleString()}
           - Duration: ${Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60))} minutes
           - Description: ${event.description || 'No description'}
           - Attendees: ${event.attendees?.join(', ') || 'Not specified'}
           - Location: ${event.location || 'Not specified'}
           - Status: ${event.status || 'confirmed'}
        `).join('\n')}

        Please provide a comprehensive analysis in JSON format:
        {
          "summary": "Overall summary of the schedule (2-3 sentences)",
          "upcomingHighlights": ["Key events and important meetings to focus on"],
          "timeInsights": ["Patterns about time usage, busy periods, etc."],
          "recommendations": ["Suggestions for better time management and scheduling"],
          "productivity": {
            "score": number between 0-100 based on schedule efficiency,
            "busyHours": ["Time periods with high activity"],
            "freeSlots": ["Available time slots for additional work"]
          }
        }

        Focus on:
        - Schedule balance and workload distribution
        - Meeting efficiency and clustering
        - Time for focused work vs collaborative work
        - Potential scheduling conflicts or improvements
        - Energy management throughout the day/week
      `;

      const result = await this.generateContentWithRetry(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);

      return {
        summary: analysisData.summary || `You have ${events.length} events scheduled for this ${timeframe}.`,
        upcomingHighlights: analysisData.upcomingHighlights || [],
        timeInsights: analysisData.timeInsights || [],
        recommendations: analysisData.recommendations || [],
        productivity: {
          score: analysisData.productivity?.score || 50,
          busyHours: analysisData.productivity?.busyHours || [],
          freeSlots: analysisData.productivity?.freeSlots || [],
        },
      };
    } catch (error) {
      console.error('Failed to summarize calendar events:', error);
      
      // Return a fallback summary
      const totalEvents = events.length;
      const totalDuration = events.reduce((sum, event) => {
        return sum + (new Date(event.end).getTime() - new Date(event.start).getTime());
      }, 0) / (1000 * 60 * 60); // Convert to hours

      return {
        summary: `You have ${totalEvents} events scheduled totaling approximately ${totalDuration.toFixed(1)} hours for this ${timeframe}.`,
        upcomingHighlights: events.slice(0, 3).map(e => e.title),
        timeInsights: [`${totalEvents} total events`, `${totalDuration.toFixed(1)} hours of scheduled time`],
        recommendations: ['Consider reviewing your schedule for optimization opportunities'],
        productivity: {
          score: Math.min(100, Math.max(0, 100 - (totalEvents * 5))), // Simple scoring
          busyHours: [],
          freeSlots: [],
        },
      };
    }
  }

  async generateActionablePlans(
    eventsSummary: {
      summary: string;
      upcomingHighlights: string[];
      recommendations: string[];
    },
    preferences?: {
      workingHours?: { start: string; end: string };
      priorities?: string[];
      focusBlocks?: number; // minutes
    }
  ): Promise<{
    dailyPlans: Array<{
      date: string;
      priorities: string[];
      timeBlocks: Array<{
        time: string;
        activity: string;
        type: 'meeting' | 'focus' | 'break' | 'prep';
      }>;
    }>;
    weeklyGoals: string[];
    optimizations: string[];
  }> {
    if (!this.model) {
      return {
        dailyPlans: [],
        weeklyGoals: [],
        optimizations: [],
      };
    }

    try {
      const prompt = `
        Based on this calendar analysis, create actionable plans:

        Schedule Summary: ${eventsSummary.summary}
        Key Events: ${eventsSummary.upcomingHighlights.join(', ')}
        Current Recommendations: ${eventsSummary.recommendations.join(', ')}

        User Preferences:
        - Working Hours: ${preferences?.workingHours?.start || '9:00 AM'} - ${preferences?.workingHours?.end || '5:00 PM'}
        - Priorities: ${preferences?.priorities?.join(', ') || 'Not specified'}
        - Preferred Focus Block Duration: ${preferences?.focusBlocks || 90} minutes

        Please provide a JSON response with actionable plans:
        {
          "dailyPlans": [
            {
              "date": "YYYY-MM-DD",
              "priorities": ["Top 3 priorities for this day"],
              "timeBlocks": [
                {
                  "time": "HH:MM AM/PM",
                  "activity": "Activity description",
                  "type": "meeting|focus|break|prep"
                }
              ]
            }
          ],
          "weeklyGoals": ["3-5 key objectives for the week"],
          "optimizations": ["Specific suggestions to improve schedule efficiency"]
        }

        Focus on:
        - Creating realistic and achievable daily plans
        - Balancing meetings with focused work time
        - Including buffer time and breaks
        - Suggesting preparation time before important meetings
        - Optimizing energy levels throughout the day
      `;

      const result = await this.generateContentWithRetry(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse actionable plans response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to generate actionable plans:', error);
      return {
        dailyPlans: [],
        weeklyGoals: ['Review and optimize current schedule', 'Improve meeting efficiency', 'Create more focus time'],
        optimizations: ['Block calendar for focused work', 'Batch similar meetings together', 'Add buffer time between meetings'],
      };
    }
  }

  /**
   * Analyze a single calendar event and provide detailed insights
   * @param event - Single event data
   * @returns Detailed analysis of the single event
   */
  async analyzeSingleEvent(event: {
    id: string;
    title: string;
    description?: string;
    start?: string;
    end?: string;
    duration: string;
    attendees: string[];
    location?: string;
    organizer?: string;
    hasVideoCall: boolean;
    timeUntilStart?: string | null;
    dayOfWeek?: string | null;
    dateFormatted?: string | null;
    timeFormatted: string;
  }) {
    if (!this.model) {
      throw new Error('Gemini AI model not initialized');
    }

    try {
      console.log('🤖 Analyzing single event with Gemini AI:', event.title);

      const prompt = `
        Analyze this single calendar event and provide detailed insights:

        EVENT DETAILS:
        Title: ${event.title}
        Date: ${event.dateFormatted || 'Unknown date'}
        Day: ${event.dayOfWeek || 'Unknown day'}
        Time: ${event.timeFormatted}
        Duration: ${event.duration}
        ${event.timeUntilStart ? `Time until start: ${event.timeUntilStart}` : ''}
        
        ${event.description ? `Description: ${event.description}` : ''}
        ${event.location ? `Location: ${event.location}` : ''}
        ${event.organizer ? `Organizer: ${event.organizer}` : ''}
        
        Attendees: ${event.attendees.length > 0 ? event.attendees.join(', ') : 'No attendees listed'}
        Has video call: ${event.hasVideoCall ? 'Yes' : 'No'}

        Please provide a comprehensive analysis with:

        1. EVENT OVERVIEW: Brief summary of what this meeting appears to be about
        2. PREPARATION INSIGHTS: What the attendee should prepare or research beforehand
        3. MEETING TYPE: Classify the meeting (1-on-1, team meeting, presentation, interview, etc.)
        4. IMPORTANCE LEVEL: Rate 1-10 and explain why
        5. TIME OPTIMIZATION: Is the duration appropriate? Any timing concerns?
        6. ATTENDEE INSIGHTS: Analysis of attendee count and potential dynamics
        7. ACTION RECOMMENDATIONS: Specific things to do before, during, and after
        8. POTENTIAL OUTCOMES: What might result from this meeting
        9. SUCCESS METRICS: How to measure if this meeting was successful
        10. FOLLOW-UP SUGGESTIONS: What typically happens after such meetings

        Provide specific, actionable insights tailored to this exact event.
        Be concise but thorough. Focus on practical value for the attendee.

        Return your analysis in JSON format:
        {
          "overview": "Brief event summary",
          "preparationInsights": ["insight1", "insight2", "insight3"],
          "meetingType": "meeting classification",
          "importance": {
            "level": number,
            "reasoning": "explanation"
          },
          "timeOptimization": {
            "durationAnalysis": "assessment",
            "timingConcerns": ["concern1", "concern2"]
          },
          "attendeeInsights": "analysis of attendee dynamics",
          "actionRecommendations": {
            "before": ["action1", "action2"],
            "during": ["action1", "action2"],
            "after": ["action1", "action2"]
          },
          "potentialOutcomes": ["outcome1", "outcome2", "outcome3"],
          "successMetrics": ["metric1", "metric2"],
          "followUpSuggestions": ["suggestion1", "suggestion2"]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate required fields
      const requiredFields = ['overview', 'preparationInsights', 'meetingType', 'importance'];
      for (const field of requiredFields) {
        if (!analysis[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      console.log('✅ Single event analysis completed successfully');

      return {
        ...analysis,
        eventId: event.id,
        eventTitle: event.title,
        analyzedAt: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Failed to analyze single event:', error);
      
      // Return fallback analysis
      return {
        eventId: event.id,
        eventTitle: event.title,
        overview: `Analysis for "${event.title}" - a ${event.duration} meeting`,
        preparationInsights: [
          'Review any related documents or materials',
          'Prepare questions or talking points',
          'Check technical setup if it\'s a video call'
        ],
        meetingType: event.attendees.length <= 2 ? '1-on-1 meeting' : 'Group meeting',
        importance: {
          level: 7,
          reasoning: 'Meeting importance assessed based on duration and attendee count'
        },
        timeOptimization: {
          durationAnalysis: `${event.duration} appears to be standard for this type of meeting`,
          timingConcerns: event.timeUntilStart === 'Started' ? ['Meeting may have already started'] : []
        },
        attendeeInsights: `Meeting with ${event.attendees.length} attendee${event.attendees.length !== 1 ? 's' : ''}`,
        actionRecommendations: {
          before: ['Join early if it\'s a video call', 'Have agenda ready'],
          during: ['Take notes', 'Actively participate'],
          after: ['Send follow-up summary', 'Complete action items']
        },
        potentialOutcomes: ['Decisions made', 'Action items assigned', 'Follow-up meetings scheduled'],
        successMetrics: ['Clear next steps defined', 'All attendees engaged'],
        followUpSuggestions: ['Send meeting summary within 24 hours', 'Schedule follow-up if needed'],
        analyzedAt: new Date().toISOString(),
        error: 'AI analysis unavailable, showing basic insights'
      };
    }
  }

  get isConfigured(): boolean {
    return this.genAI !== null && this.model !== null;
  }
}

// Export singleton instance
export const geminiService = new GeminiAIService();