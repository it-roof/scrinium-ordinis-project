"use client"

import {
  BookOpen,
  FilePenLine,
  FileStack,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  Library,
  Scale,
  Send,
  Sparkles,
  StickyNote,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type * as React from "react"

import { NavSecondary } from "@/components/desk/dashboard/nav-secondary"
import { NavUser } from "@/components/desk/dashboard/nav-user"
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
} from "@/components/desk/ui/sidebar"
import type { DeskRoleId } from "@/lib/area/desk-roles"
import type { AreaFunctionId } from "@/lib/area/functions"
import {
  DESK_DASHBOARD_HREF,
  hrefFor,
  parsePracticeFromPathname,
  practiceBasePath,
} from "@/lib/area/paths"
import { APP_MODULES, type AppModuleId } from "@/lib/modules"
import { cn } from "@/lib/utils"
import { writeActiveAreaCookie } from "@/lib/area/active-area"

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

function PracticeSwitcher({
  area,
  practices,
}: {
  area: AppModuleId
  practices: readonly AppModuleId[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  if (practices.length <= 1) {
    return null
  }

  const options = APP_MODULES.filter((module) => practices.includes(module.id))

  function selectPractice(next: AppModuleId) {
    if (next === area) {
      return
    }
    writeActiveAreaCookie(next)
    const current = parsePracticeFromPathname(pathname)
    if (current) {
      const rest = pathname.slice(practiceBasePath(current).length) || ""
      router.push(`${practiceBasePath(next)}${rest}`)
      return
    }
    router.refresh()
  }

  return (
    <div
      className="flex flex-wrap gap-x-3 gap-y-1 px-2 pb-2"
      role="listbox"
      aria-label="Bereich wählen"
    >
      {options.map((module) => {
        const isActive = area === module.id
        return (
          <button
            key={module.id}
            type="button"
            role="option"
            aria-selected={isActive}
            onClick={() => selectPractice(module.id)}
            className={cn(
              "text-xs font-medium transition-colors",
              isActive
                ? "text-sidebar-foreground underline underline-offset-4"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            )}
          >
            {module.label}
          </button>
        )
      })}
    </div>
  )
}

export function AppSidebar({
  user,
  brandLabel = "Scrinium Ordinis",
  area = "legal",
  deskRole = "rechtsanwalt",
  allowedFunctions = null,
  practices = [],
  showAiDebug = false,
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
  practices?: readonly AppModuleId[]
  showAiDebug?: boolean
}) {
  void deskRole

  const communicationItems: NavItem[] = (
    [
      {
        title: "Meine Aufgaben",
        url: hrefFor("inbox"),
        icon: Inbox,
        functionId: "inbox",
      },
      {
        title: "Aufgabe zuweisen",
        url: hrefFor("staff-messages"),
        icon: Send,
        functionId: "staff-messages",
      },
    ] as const satisfies readonly NavItem[]
  ).filter(
    (item) =>
      !item.functionId || isAllowed(allowedFunctions, item.functionId)
  )

  const functionItems: NavItem[] = (
    [
      {
        title: "KI-Analyse",
        url: hrefFor("case-facts-analysis", area),
        icon: Scale,
        functionId: "case-facts-analysis",
      },
      {
        title: "Prompt-Bibliothek",
        url: hrefFor("prompts"),
        icon: Sparkles,
        functionId: "prompts",
      },
      {
        title: "Notizen",
        url: hrefFor("notes"),
        icon: StickyNote,
        functionId: "notes",
      },
      {
        title: "Schreiben",
        url: hrefFor("letters", area),
        icon: FilePenLine,
        functionId: "letters",
      },
      {
        title: "Textbausteine",
        url: hrefFor("text-blocks", area),
        icon: Library,
        functionId: "text-blocks",
      },
      {
        title: "Dokumentation",
        url: hrefFor("docs", area),
        icon: BookOpen,
        functionId: "docs",
      },
      {
        title: "Vorlagen",
        url: hrefFor("templates", area),
        icon: FileStack,
        functionId: "templates",
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
        url: hrefFor("clients", area),
        icon: Users,
        functionId: "clients" as const,
      },
      {
        title: "Akten",
        url: hrefFor("matters", area),
        icon: FolderOpen,
        functionId: "matters" as const,
      },
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
              <Link href={DESK_DASHBOARD_HREF}>
                <span className="text-base font-semibold">{brandLabel}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <PracticeSwitcher area={area} practices={practices} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Übersicht">
                <Link href={DESK_DASHBOARD_HREF}>
                  <LayoutDashboard />
                  <span>Übersicht</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <NavSection label="Kommunikation" items={communicationItems} />
        <NavSection label="Funktionen" items={functionItems} />
        <NavSection label="Daten" items={managementItems} />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} showAiDebug={showAiDebug} />
      </SidebarFooter>
    </Sidebar>
  )
}
