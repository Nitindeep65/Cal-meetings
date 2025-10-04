"use client"

import {
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  MoreVerticalIcon,
  UserCircleIcon,
  RefreshCwIcon,
} from "lucide-react"
import { signOut } from "@/lib/nextAuthShim"
import { useComposioUserProfile } from "@/hooks/use-composio-user-profile"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"

export function NavUser({
  user,
  userId,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  userId?: string
}) {
  const { isMobile } = useSidebar()
  
  // Debug logging
  console.log('NavUser received user data:', user)
  console.log('NavUser received userId:', userId)
  
  // Fetch real-time profile data from Composio
  const { profile, loading, error, refetch } = useComposioUserProfile(userId)
  
  // Prioritize Composio profile data, fallback to provided user data only if no profile
  const displayUser = {
    name: profile?.name || user.name,
    email: profile?.email || user.email,
    avatar: profile?.picture || user.avatar
  }
  
  // Debug logging for profile data
  console.log('Profile from Composio:', profile)
  console.log('Display user data:', displayUser)

  // Generate initials from user name
  const getInitials = (name: string) => {
    if (!name || name.trim() === '') return 'U'
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Show loading state if we're still fetching profile
  const isLoadingProfile = loading && !profile
  
  // Final user data with real-time updates from Composio
  const finalUserData = {
    name: displayUser.name || (isLoadingProfile ? 'Loading...' : 'Not connected'),
    email: displayUser.email || (isLoadingProfile ? 'Connecting...' : 'Please login with Composio'),
    avatar: displayUser.avatar || ''
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={finalUserData.avatar} alt={finalUserData.name} />
                <AvatarFallback className="rounded-lg">{getInitials(finalUserData.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-foreground">
                  {finalUserData.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {finalUserData.email}
                </span>
                {loading && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <RefreshCwIcon className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-xs text-muted-foreground">Syncing...</span>
                  </div>
                )}
                {!profile && loading && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <RefreshCwIcon className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-xs text-muted-foreground">Connecting...</span>
                  </div>
                )}
              </div>
              <MoreVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={finalUserData.avatar} alt={finalUserData.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(finalUserData.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {finalUserData.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {finalUserData.email}
                  </span>
                  {profile && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="secondary" className="text-xs px-1 py-0 h-auto">
                        Connected
                      </Badge>
                    </div>
                  )}
                  {error && (
                    <span className="text-xs text-red-500 mt-0.5">
                      Profile sync failed
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserCircleIcon />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellIcon />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => refetch()} disabled={loading}>
                <RefreshCwIcon className={loading ? "animate-spin" : ""} />
                {loading ? "Refreshing..." : "Refresh Profile"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
