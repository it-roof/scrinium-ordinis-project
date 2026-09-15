"use client"

import { SUPPORT_CONTACT } from "@scrinium/brand"
import { ChartNoAxesColumnIncreasing, Headphones } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/v1/ui/dropdown-menu"
import { cn } from "@/lib/utils"

function HeaderNavButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function HeaderUtilityNav({ dbConnected }: { dbConnected: boolean }) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <HeaderNavButton>
            <Headphones className="size-3.5" aria-hidden />
            Hilfe anfordern
          </HeaderNavButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-lg">
          <DropdownMenuLabel className="font-normal">
            <div className="space-y-1">
              <p className="text-sm font-medium">Hilfe anfordern</p>
              <p className="text-xs text-muted-foreground">
                {SUPPORT_CONTACT.company}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="space-y-1.5 px-2 py-1.5 text-sm">
            <p className="font-medium text-foreground">{SUPPORT_CONTACT.name}</p>
            <p>
              <a
                href={SUPPORT_CONTACT.phoneHref}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {SUPPORT_CONTACT.phone}
              </a>
            </p>
            <p>
              <a
                href={`mailto:${SUPPORT_CONTACT.email}`}
                className="break-all text-muted-foreground hover:text-foreground hover:underline"
              >
                {SUPPORT_CONTACT.email}
              </a>
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <HeaderNavButton>
            <ChartNoAxesColumnIncreasing
              className={cn(
                "size-3.5",
                dbConnected ? "text-emerald-500" : "text-red-500"
              )}
              aria-hidden
            />
            Status
          </HeaderNavButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-lg">
          <DropdownMenuLabel className="font-normal">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status</p>
              <p className="text-xs text-muted-foreground">Systemzustand</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                dbConnected ? "bg-emerald-500" : "bg-red-500"
              )}
              aria-hidden
            />
            <span>
              Datenbank{" "}
              <span className="font-medium text-foreground">
                {dbConnected ? "verbunden" : "offline"}
              </span>
            </span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
