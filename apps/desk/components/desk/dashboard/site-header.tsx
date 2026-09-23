import { HeaderUtilityNav } from "@/components/desk/dashboard/header-utility-nav"
import { Separator } from "@/components/desk/ui/separator"
import { SidebarTrigger } from "@/components/desk/ui/sidebar"

/** Mobile-only chrome — Desktop folgt Alba (kein Top-Header wie im Lab). */
export function SiteHeader({
  title = "Übersicht",
  roleLabel = "Rechtsanwalt",
  dbConnected = true,
}: {
  title?: string
  roleLabel?: string
  dbConnected?: boolean
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear md:hidden">
      <div className="flex w-full items-center gap-1 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <span className="flex min-w-0 items-center gap-2 text-base leading-none">
          <span className="truncate text-muted-foreground">{roleLabel}</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="truncate font-medium">{title}</span>
        </span>
        <HeaderUtilityNav dbConnected={dbConnected} />
      </div>
    </header>
  )
}
