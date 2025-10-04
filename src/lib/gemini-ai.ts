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

  get isConfigured(): boolean {
    return this.genAI !== null && this.model !== null;
  }
}

// Export singleton instance
export const geminiService = new GeminiAIService();