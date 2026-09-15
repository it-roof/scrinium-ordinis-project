"use client"

import { MessagesSquare, Plus } from "lucide-react"
import Link from "next/link"

import type { AppModuleId } from "@/lib/modules"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/v1/ui/sidebar"

export function NavKommunikation({ area: _area }: { area: AppModuleId }) {
  const items = [
    {
      title: "Meine Aufgaben",
      url: "/v1/eingang",
      icon: MessagesSquare,
    },
    {
      title: "Aufgaben zuweisen",
      url: "/v1/zuweisen",
      icon: Plus,
    },
  ]

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Kommunikation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <Link href={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
