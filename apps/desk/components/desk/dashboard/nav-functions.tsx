"use client"

import { Sparkles } from "lucide-react"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/desk/ui/sidebar"

const functionItems = [
  {
    title: "Prompt-Bibliothek",
    url: "/prompt",
    icon: Sparkles,
  },
]

export function NavFunctions() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Funktionen</SidebarGroupLabel>
      <SidebarMenu>
        {functionItems.map((item) => (
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
