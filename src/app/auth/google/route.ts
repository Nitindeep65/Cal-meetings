import { NextResponse } from 'next/server'

export async function GET() {
  // Redirect to NextAuth Google sign-in
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return NextResponse.redirect(`${baseUrl}/api/auth/signin/google`)
}
