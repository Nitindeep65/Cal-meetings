'use client'

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ComposioLoginButton } from "./composio-login-button"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setErrorMessage('')
    
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setEmailSent(true)
      } else {
        // Handle different types of errors gracefully
        setErrorMessage(data.helpText || data.error || 'Failed to send magic link. Please try Google authentication below.')
      }
    } catch (error) {
      console.error('Error sending magic link:', error)
      setErrorMessage('Network error. Please try Google authentication below.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Welcome to Cal Meetings</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Sign in with email magic link or Google account to access your calendar
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Email Magic Link Form */}
        {!emailSent ? (
          <form onSubmit={handleMagicLink} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            {errorMessage && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700">
                  ⚠️ {errorMessage}
                </p>
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={isLoading || !email}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                  Sending Magic Link...
                </>
              ) : (
                'Send Magic Link'
              )}
            </Button>
          </form>
        ) : (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✨ Magic link sent to <strong>{email}</strong>! 
            </p>
            <p className="text-sm text-green-600 mt-1">
              Check your inbox and click the link to sign in.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => {
                setEmailSent(false)
                setEmail('')
              }}
            >
              Try Different Email
            </Button>
          </div>
        )}

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or
            </span>
          </div>
        </div>

        {/* Composio Google Calendar Authentication */}
        <ComposioLoginButton />
      </div>
    </div>
  )
}
