import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'email' as const,
      })

      if (error) {
        console.error('Error verifying magic link:', error)
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=verification_failed`)
      }

      if (data.user) {
        // Store user info in a way that can be accessed by the dashboard
        // For now, redirect to dashboard with success message
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?auth=magic-link&email=${encodeURIComponent(data.user.email || '')}`)
      }
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=invalid_link`)
  } catch (error) {
    console.error('Error in magic link callback:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=callback_error`)
  }
}