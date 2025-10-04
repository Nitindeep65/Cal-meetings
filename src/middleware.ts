import { withAuth } from "next-auth/middleware"

export default withAuth(
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

// Protect these routes
export const config = {
  matcher: ['/dashboard/:path*']
}