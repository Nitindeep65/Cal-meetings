import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Debug: Log the configuration
    console.log('🔍 Supabase config check:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      redirectTo: `${process.env.NEXTAUTH_URL}/dashboard`
    })

    // Test Supabase connection first
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXTAUTH_URL}/dashboard`,
        },
      })

      console.log('🔍 Supabase response:', { data, error })

      if (error) {
        console.error('Supabase magic link error:', error)
        
        // Provide specific error messages based on common issues
        if (error.message.includes('Invalid API key') || error.message.includes('401')) {
          return NextResponse.json({ 
            error: 'Authentication service configuration issue',
            helpText: 'Email authentication is enabled but there may be an API key or RLS policy issue. Please use Google Calendar authentication.',
            debug: `Error: ${error.message}`
          }, { status: 503 })
        }
        
        if (error.message.includes('Email not confirmed')) {
          return NextResponse.json({ 
            error: 'Email confirmation required',
            helpText: 'Please check your email and confirm your account first.'
          }, { status: 400 })
        }
        
        return NextResponse.json({ 
          error: `Magic link error: ${error.message}`,
          helpText: 'Please try again or use Google Calendar authentication.',
          debug: `Status: ${error.status || 'unknown'}`
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Magic link sent successfully! Check your email.' 
      })
      
    } catch (supabaseError) {
      console.error('Supabase connection error:', supabaseError)
      
      // Fallback: Return success but explain the limitation
      return NextResponse.json({ 
        success: false,
        error: 'Magic link service is currently unavailable',
        helpText: 'Please use Google Calendar authentication below, or contact support.',
        fallback: 'google-auth'
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Error in magic link handler:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      helpText: 'Please try Google Calendar authentication.'
    }, { status: 500 })
  }
}