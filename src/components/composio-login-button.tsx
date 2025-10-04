'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar } from 'lucide-react';

export function ComposioLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleComposioLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Generate a unique user ID (in production, use actual user identification)
      const userId = `user_${Date.now()}`;

      // Initiate Composio authentication
      const response = await fetch('/api/composio/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!data.success) {
        const errorMsg = data.error || 'Failed to initiate Composio authentication';
        if (errorMsg.includes('auth config not configured') || errorMsg.includes('API key')) {
          throw new Error('Composio configuration missing. Please check COMPOSIO_API_KEY and COMPOSIO_AUTH_CONFIG_ID in environment variables.');
        }
        throw new Error(errorMsg);
      }

      // Store connection info in sessionStorage for tracking
      sessionStorage.setItem('composio_connection_id', data.connectionId);
      sessionStorage.setItem('composio_user_id', userId);

      // Open Google OAuth in popup
      const popup = window.open(
        data.redirectUrl, 
        'composio-auth', 
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Track if we've redirected to avoid multiple redirects
      let hasRedirected = false;

      // Poll for completion via API
      const pollInterval = setInterval(async () => {
        try {
          // Check if popup was closed manually
          if (popup?.closed) {
            clearInterval(pollInterval);
            setIsLoading(false);
            setError('Authentication was cancelled. Please try again.');
            return;
          }

          // Check connection status
          const statusResponse = await fetch(`/api/composio/auth?connectionId=${data.connectionId}`);
          const statusData = await statusResponse.json();

          console.log('Connection status:', statusData);
          
          // Check for successful connection
          if (statusData.success && statusData.connection && !hasRedirected) {
            const status = statusData.connection.status?.toLowerCase();
            
            if (status === 'active' || status === 'connected' || status === 'success') {
              hasRedirected = true;
              clearInterval(pollInterval);
              popup?.close();
              setIsLoading(false);
              
              console.log('API polling detected success - redirecting to dashboard');
              router.push('/dashboard?auth=composio');
              return;
            }
          }
          
          // If popup is closed and we haven't redirected yet
          if (popup?.closed && !hasRedirected) {
            hasRedirected = true;
            clearInterval(pollInterval);
            setIsLoading(false);
            
            // Give a short delay to ensure any final processing is complete
            console.log('Popup closed - assuming successful authentication, redirecting to dashboard');
            setTimeout(() => {
              router.push('/dashboard?auth=composio');
            }, 1000);
            return;
          }
        } catch (pollError) {
          console.error('Error polling connection status:', pollError);
        }
      }, 2000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!popup?.closed) {
          popup?.close();
        }
        setIsLoading(false);
        if (!hasRedirected) {
          setError('Authentication timeout. Please try again.');
        }
      }, 300000);

    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <div className="space-y-2">
      <Button 
        variant="outline" 
        className="w-full"
        onClick={handleComposioLogin}
        disabled={isLoading}
        type="button"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting via Composio...
          </>
        ) : (
          <>
            <div className="mr-2 h-4 w-4 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            Sign in with Google Calendar via Composio
          </>
        )}
      </Button>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            ❌ {error}
          </p>
        </div>
      )}
      
      {isLoading && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            🔗 Please complete authentication in the popup window...
          </p>
          <Button 
            variant="link" 
            size="sm"
            className="text-xs mt-2 p-0 h-auto"
            onClick={() => {
              setIsLoading(false);
              router.push('/dashboard?auth=composio');
            }}
          >
            Already authenticated? Go to Dashboard →
          </Button>
        </div>
      )}
    </div>
  );
}