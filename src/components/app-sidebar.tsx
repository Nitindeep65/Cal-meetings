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
  LayoutDashboard,
} from "lucide-react"

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

const data = {
  user: {
    name: "Cal User",
    email: "user@cal-meetings.com",
    avatar: "/avatars/user.jpg",
  },
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
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
