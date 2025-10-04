'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface ComposioAuthProps {
  onSuccess?: (connectionId: string) => void;
  onError?: (error: string) => void;
}

export default function ComposioAuth({ onSuccess, onError }: ComposioAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting' | 'success' | 'error'>('idle');
  const [connectionId, setConnectionId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleComposioAuth = async () => {
    setIsLoading(true);
    setStatus('connecting');
    setError('');

    try {
      // Generate a unique user ID (in production, use the actual user ID from your auth system)
      const userId = `user_${Date.now()}`;

      // Initiate Composio auth
      const response = await fetch('/api/composio/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate authentication');
      }

      setConnectionId(data.connectionId);
      setStatus('waiting');

      // Redirect user to Google OAuth
      window.open(data.redirectUrl, '_blank', 'width=500,height=600');

      // Poll for connection status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/composio/auth?connectionId=${data.connectionId}`);
          const statusData = await statusResponse.json();

          if (statusData.success && statusData.connection.status === 'active') {
            clearInterval(pollInterval);
            setStatus('success');
            setIsLoading(false);
            onSuccess?.(data.connectionId);
          }
        } catch (pollError) {
          console.error('Error polling connection status:', pollError);
        }
      }, 3000);

      // Clear polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (status === 'waiting') {
          setStatus('error');
          setError('Authentication timeout. Please try again.');
          setIsLoading(false);
          onError?.('Authentication timeout');
        }
      }, 300000);

    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setIsLoading(false);
      onError?.(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connecting':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'waiting':
        return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'connecting':
        return 'Initializing Composio authentication...';
      case 'waiting':
        return 'Please complete authentication in the popup window';
      case 'success':
        return 'Successfully connected to Google Calendar via Composio!';
      case 'error':
        return error || 'Authentication failed';
      default:
        return 'Connect your Google Calendar using Composio';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'connecting':
      case 'waiting':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Calendar className="h-6 w-6" />
          Composio Calendar Integration
        </CardTitle>
        <CardDescription>
          Connect your Google Calendar using Composio&apos;s managed authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusMessage()}
          </span>
        </div>

        {status === 'idle' && (
          <Button 
            onClick={handleComposioAuth}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Connect with Composio
              </>
            )}
          </Button>
        )}

        {status === 'waiting' && (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              Connection ID: <code className="text-xs bg-gray-100 px-1 rounded">{connectionId}</code>
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setStatus('idle');
                setIsLoading(false);
                setConnectionId('');
              }}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 font-medium">
              ✅ Composio integration successful!
            </p>
            <p className="text-xs text-gray-500">
              You can now use Composio tools to manage your calendar
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-2">
            <p className="text-sm text-red-600">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setStatus('idle');
                setError('');
                setIsLoading(false);
              }}
              size="sm"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}