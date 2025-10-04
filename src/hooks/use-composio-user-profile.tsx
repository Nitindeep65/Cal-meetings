'use client';

import { useState, useEffect } from 'react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  timeZone?: string;
  language?: string;
}

interface UseComposioUserProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useComposioUserProfile(userId?: string): UseComposioUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First try to get auth session info (which includes user profile)
      const authResponse = await fetch('/api/composio/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_auth_session',
          userId
        })
      });

      if (authResponse.ok) {
        const authResult = await authResponse.json();
        if (authResult.success && authResult.session?.user) {
          const user = authResult.session.user;
          setProfile({
            id: user.id || userId,
            name: user.name || user.displayName || null,
            email: user.email || null,
            picture: user.picture || user.photo || user.avatar_url,
            timeZone: user.timeZone,
            language: user.language
          });
          setLoading(false);
          return;
        }
      }

      // Fallback to get user profile directly
      const profileResponse = await fetch('/api/composio/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_profile',
          userId
        })
      });

      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();
        if (profileResult.success && profileResult.profile) {
          const user = profileResult.profile;
          setProfile({
            id: user.id || userId,
            name: user.name || user.displayName || (user.given_name && user.family_name ? user.given_name + ' ' + user.family_name : null),
            email: user.email || null,
            picture: user.picture || user.photo || user.avatar_url,
            timeZone: user.timeZone,
            language: user.language
          });
        } else {
          // Don't set profile if API calls fail - let components handle the loading/error state
          setProfile(null);
        }
      } else {
        throw new Error('Failed to fetch user profile');
      }

    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      
      // Don't set fallback profile data - let components handle the error state
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile
  };
}