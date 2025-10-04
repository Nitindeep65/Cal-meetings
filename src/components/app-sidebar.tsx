"use client"

import * as React from "react"
import {
  Calendar,
  CalendarDays,
  Clock,
  Users,
  Video,
  Settings,
  HelpCircle,
  Search,
  Plus,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useComposioUserProfile } from "@/hooks/use-composio-user-profile"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const staticData = {
  navMain: [
    {
      title: "Calendar",
      url: "/dashboard",
      icon: Calendar,
    },
    {
      title: "My Meetings",
      url: "#",
      icon: CalendarDays,
    },
    {
      title: "Upcoming",
      url: "#",
      icon: Clock,
    },
    {
      title: "Contacts",
      url: "#",
      icon: Users,
    },
  ],
  navClouds: [
    {
      title: "Video Calls",
      icon: Video,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Join Meeting",
          url: "#",
        },
        {
          title: "Meeting History",
          url: "#",
        },
      ],
    },
    {
      title: "Scheduling",
      icon: Clock,
      url: "#",
      items: [
        {
          title: "Available Times",
          url: "#",
        },
        {
          title: "Time Zones",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Help",
      url: "#",
      icon: HelpCircle,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Meeting Templates",
      url: "#",
      icon: Calendar,
    },
    {
      name: "Reports",
      url: "#",
      icon: Clock,
    },
    {
      name: "Quick Actions",
      url: "#",
      icon: Plus,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()

  // Get Composio connection ID from sessionStorage for real-time data
  const composioConnectionId = typeof window !== 'undefined' ? sessionStorage.getItem('composio_connection_id') : null
  
  // Use connection ID for profile fetching, fallback to email if no connection
  const userId = composioConnectionId || session?.user?.email || undefined

  // Get real Composio profile data
  const { profile: composioProfile, loading: profileLoading } = useComposioUserProfile(userId)

  // Create data object with real Composio profile when available
  const data = {
    user: {
      name: composioProfile?.name || (profileLoading ? "Loading..." : (composioConnectionId ? "Connecting..." : "Please connect with Composio")),
      email: composioProfile?.email || (profileLoading ? "Loading..." : (composioConnectionId ? "Connecting..." : "Not connected")), 
      avatar: composioProfile?.picture || session?.user?.image || "",
    },
    navMain: staticData.navMain,
    navClouds: staticData.navClouds,
    navSecondary: staticData.navSecondary,
    documents: staticData.documents,
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Calendar className="h-5 w-5" />
                <span className="text-base font-semibold">Cal Meetings</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} userId={userId} />
      </SidebarFooter>
    </Sidebar>
  )
}
