"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type * as React from "react"

import { NavUser } from "@/components/desk/dashboard/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/desk/ui/sidebar"
import type { DeskRoleId } from "@/lib/area/desk-roles"
import type { AreaFunctionId } from "@/lib/area/functions"
import {
  DESK_DASHBOARD_HREF,
  hrefFor,
  parsePracticeFromPathname,
  practiceBasePath,
} from "@/lib/area/paths"
import { writeActiveAreaCookie } from "@/lib/area/active-area"
import { APP_MODULES, type AppModuleId } from "@/lib/modules"
import { cn } from "@/lib/utils"

/** Lab-Nav 1:1 — /neues-design/alba-manrope */
const LAB_NAV: ReadonlyArray<{
  label: string
  href: (area: AppModuleId) => string
  match?: (pathname: string, href: string) => boolean
}> = [
  {
    label: "Übersicht",
    href: () => DESK_DASHBOARD_HREF,
    match: (pathname, href) =>
      pathname === href || pathname.startsWith(`${href}/`),
  },
  {
    label: "Meine Aufgaben",
    href: () => hrefFor("inbox"),
  },
  {
    label: "Zuweisen",
    href: () => hrefFor("staff-messages"),
  },
  {
    label: "Akten",
    href: (area) => hrefFor("matters", area),
  },
  {
    label: "Mandanten",
    href: (area) => hrefFor("clients", area),
  },
  {
    label: "KI",
    href: () => hrefFor("ai-chat"),
  },
  {
    label: "Analyse",
    href: (area) => hrefFor("case-facts-analysis", area),
  },
  {
    label: "Vertragsanalyse",
    href: () => hrefFor("contract-analysis"),
  },
  {
    label: "Prompts",
    href: () => hrefFor("prompts"),
  },
  {
    label: "Notizen",
    href: () => hrefFor("notes"),
  },
]

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
      className="mt-4 flex flex-wrap gap-x-2 gap-y-1 px-2"
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
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
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
  brandLabel: _brandLabel = "Scrinium Ordinis",
  area = "legal",
  deskRole = "rechtsanwalt",
  allowedFunctions: _allowedFunctions = null,
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
  void _brandLabel
  void _allowedFunctions

  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="px-4 pt-8">
        <Link
          href={DESK_DASHBOARD_HREF}
          className="flex items-center gap-3 px-2 pt-1 outline-none"
        >
          <span
            className="b-display flex size-10 shrink-0 items-center justify-center rounded-full text-[1.15rem]"
            style={{
              background: "var(--b-soft)",
              color: "var(--b-accent)",
            }}
            aria-hidden
          >
            A
          </span>
          <span className="min-w-0">
            <span className="b-display block text-[1.25rem] leading-none">
              Alba
            </span>
            <span className="b-meta mt-1 block">Quiet desk</span>
          </span>
        </Link>
        <PracticeSwitcher area={area} practices={practices} />
      </SidebarHeader>

      <SidebarContent className="px-4 pt-9">
        <nav className="flex flex-1 flex-col gap-1 px-0.5">
          {LAB_NAV.map((item) => {
            const url = item.href(area)
            const isActive = item.match
              ? item.match(pathname, url)
              : pathname === url || pathname.startsWith(`${url}/`)
            return (
              <Link
                key={item.label}
                href={url}
                className="rounded-full px-3.5 py-2.5 text-[0.9375rem] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                style={
                  isActive
                    ? {
                        background: "var(--b-soft)",
                        color: "var(--b-ink)",
                        fontWeight: 600,
                      }
                    : {
                        color: "var(--b-muted)",
                        fontWeight: 400,
                      }
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter className="gap-3 px-4 pb-8">
        <div
          className="rounded-[10px] px-3.5 py-3"
          style={{ background: "var(--b-soft)" }}
        >
          <p className="text-[0.8125rem] font-semibold">Scrinium</p>
          <p className="b-meta mt-0.5">Quiet workspace</p>
        </div>
        <NavUser user={user} showAiDebug={showAiDebug} />
      </SidebarFooter>
    </Sidebar>
  )
}
