/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Lightweight shim for next-auth/react to avoid runtime network requests
// when NextAuth is not configured in this project. This exports the minimal
// APIs used by the app: useSession and signOut. The shim returns a stable
// unauthenticated session and avoids any client fetches.

import { useState, useEffect } from 'react'

export function useSession() {
  // Keep the same shape as next-auth's useSession hook: { data, status }
  // Use `any` for `data` so components that access `session.user` don't
  // produce TypeScript errors while NextAuth is not configured.
  const [state] = useState<{ data: any; status: 'unauthenticated' }>(
    () => ({ data: null, status: 'unauthenticated' })
  )

  // No side-effects, no network calls
  useEffect(() => {
    // no-op
  }, [])

  return state
}

export async function signOut(options?: { callbackUrl?: string }) {
  // If a callbackUrl is provided, navigate there; otherwise do a no-op.
  if (typeof window !== 'undefined') {
    const target = options?.callbackUrl || window.location.pathname
    window.location.href = target
  }
}

const _default = { useSession, signOut }

export default _default
