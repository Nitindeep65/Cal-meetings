'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Shield, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface CalendarAuthProps {
  onAuthComplete: (mcpEndpoint: string) => void
}

export function CalendarAuth({ onAuthComplete }: CalendarAuthProps) {
  const { data: session } = useSession()
  const [authStatus, setAuthStatus] = useState<'checking' | 'needed' | 'authorizing' | 'completed'>('checking')
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthStatus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/calendar/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_auth_status' }),
      })
      
      const data = await response.json()
      
      if (data.success && data.isAuthorized && data.mcpEndpoint) {
        setAuthStatus('completed')
        onAuthComplete(data.mcpEndpoint)
      } else {
        setAuthStatus('needed')
      }
    } catch (err) {
      console.error('Failed to check auth status:', err)
      setError('Failed to check authorization status')
      setAuthStatus('needed')
    }
  }

  const initiateAuth = async () => {
    try {
      setAuthStatus('authorizing')
      setError(null)
      
      const response = await fetch('/api/calendar/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initiate_calendar_auth' }),
      })
      
      const data = await response.json()
      
      if (data.success && data.authUrl) {
        setAuthUrl(data.authUrl)
      } else {
        setError(data.error || 'Failed to initiate authorization')
        setAuthStatus('needed')
      }
    } catch (err) {
      console.error('Failed to initiate auth:', err)
      setError('Failed to start authorization process')
      setAuthStatus('needed')
    }
  }

  const handleManualSetup = () => {
    // For now, we'll show instructions for manual setup
    setAuthUrl('https://app.composio.dev/connections')
  }

  if (authStatus === 'checking') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Calendar className="h-5 w-5 animate-pulse" />
            <span>Checking calendar authorization...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (authStatus === 'completed') {
    return (
      <Card className="max-w-md mx-auto border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span>Calendar connected successfully!</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">Connect Your Google Calendar</CardTitle>
        <p className="text-muted-foreground">
          To view and manage your calendar events, please authorize access to your Google Calendar.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <strong>Safe & Secure:</strong> We use Composio&apos;s secure platform to connect to your calendar. We never store your Google credentials.
            </div>
          </div>
          
          <div className="flex items-start space-x-3 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <strong>Read & Write Access:</strong> We need permission to view your events and create new meetings when requested.
            </div>
          </div>
          
          <div className="flex items-start space-x-3 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <strong>Your Privacy:</strong> Only you can see your calendar data. We don&apos;t share it with anyone.
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          {authUrl ? (
            <div className="space-y-3">
              <Button 
                onClick={() => window.open(authUrl, '_blank')} 
                className="w-full"
                size="lg"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Authorize Calendar Access
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>After authorization, return here and refresh the page</p>
              </div>
              
              <Button 
                variant="outline" 
                onClick={checkAuthStatus}
                className="w-full"
              >
                Check Authorization Status
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                onClick={initiateAuth} 
                className="w-full"
                size="lg"
                disabled={authStatus === 'authorizing'}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {authStatus === 'authorizing' ? 'Preparing...' : 'Connect Google Calendar'}
              </Button>
              
              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={handleManualSetup}
                  className="text-sm text-muted-foreground"
                >
                  Manual Setup Instructions
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t text-xs text-muted-foreground text-center">
          <p>
            Signed in as <strong>{session?.user?.email}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}