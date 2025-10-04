'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle } from 'lucide-react'

export function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === 'loading') return null
  if (!session) return null

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-green-800">
          <CheckCircle className="h-4 w-4" />
          Google Calendar Connected
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-green-700">
            <Calendar className="h-3 w-3" />
            Signed in as {session.user?.email}
          </div>
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
            Active
          </Badge>
        </div>
        <p className="mt-2 text-xs text-green-600">
          Your calendar events and AI insights are now available below.
        </p>
      </CardContent>
    </Card>
  )
}