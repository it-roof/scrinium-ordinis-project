"use client"

import {
  FolderOpen,
  LayoutDashboard,
  Library,
  Sparkles,
  StickyNote,
  Users,
} from "lucide-react"
import Link from "next/link"
import type * as React from "react"

import { NavSecondary } from "@/components/v1/dashboard/nav-secondary"
import { NavUser } from "@/components/v1/dashboard/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/v1/ui/sidebar"
import type { DeskRoleId } from "@/lib/area/desk-roles"
import type { AreaFunctionId } from "@/lib/area/functions"
import type { AppModuleId } from "@/lib/modules"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  functionId?: AreaFunctionId
}

function isAllowed(
  allowedFunctions: AreaFunctionId[] | null | undefined,
  id: AreaFunctionId
) {
  return allowedFunctions == null || allowedFunctions.includes(id)
}

function NavSection({
  label,
  items,
}: {
  label: string
  items: NavItem[]
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
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

export function AppSidebar({
  user,
  brandLabel = "Scrinium Ordinis",
  area: _area = "legal",
  deskRole = "rechtsanwalt",
  allowedFunctions = null,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar?: string
  }
  brandLabel?: string
  area?: AppModuleId
  deskRole?: DeskRoleId
  allowedFunctions?: AreaFunctionId[] | null
}) {
  const functionItems: NavItem[] = (
    [
      {
        title: "Prompt-Bibliothek",
        url: "/v1/prompt",
        icon: Sparkles,
        functionId: "prompts",
      },
      {
        title: "Notizen",
        url: "/v1/notizen",
        icon: StickyNote,
        functionId: "notes",
      },
      {
        title: "Textbausteine",
        url: "/v1/textbausteine",
        icon: Library,
        functionId: "text-blocks",
      },
    ] as const satisfies readonly NavItem[]
  ).filter(
    (item) =>
      !item.functionId || isAllowed(allowedFunctions, item.functionId)
  )

  const managementItems: NavItem[] = (
    [
      {
        title: "Mandanten",
        url: "/v1/mandanten",
        icon: Users,
        functionId: "clients" as const,
      },
      ...(deskRole === "sekretariat"
        ? [
            {
              title: "Akten",
              url: "/v1/akten",
              icon: FolderOpen,
              functionId: "matters" as const,
            },
          ]
        : []),
    ] satisfies NavItem[]
  ).filter(
    (item) => !item.functionId || isAllowed(allowedFunctions, item.functionId)
  )

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/v1/dashboard">
                <span className="text-base font-semibold">{brandLabel}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Übersicht">
                <Link href="/v1/dashboard">
                  <LayoutDashboard />
                  <span>Übersicht</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <NavSection label="Funktionen" items={functionItems} />
        <NavSection label="Daten" items={managementItems} />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
