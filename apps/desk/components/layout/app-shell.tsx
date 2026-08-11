"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import {
  ActiveAreaProvider,
  useActiveArea,
  useOptionalActiveArea,
} from "@/components/layout/active-area-provider";
import { AreaSwitcher } from "@/components/layout/area-switcher";
import { DbConnectionStatus } from "@/components/layout/db-connection-status";
import {
  AREA_ACCENT_DOT,
  canvasClassForArea,
} from "@/lib/area/canvas";
import { areaBasePath } from "@/lib/area/paths";
import { getPageMeta, platformNavItem, type NavItem } from "@/lib/navigation";
import { navigationForArea } from "@/lib/area/functions";
import type { ActiveArea } from "@/lib/area/active-area";
import type { AppModuleId } from "@/lib/modules";
import type { PlatformRole, UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({
  children,
  user,
  brandLabel,
  allowedAreas,
  initialActiveArea,
  dbConnected,
}: {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    role: UserRole;
    platformRole?: PlatformRole | null;
  };
  /** Anzeigename nach Login (Tenant brand_name oder Produktmarke). */
  brandLabel: string;
  allowedAreas: AppModuleId[];
  initialActiveArea: ActiveArea;
  dbConnected: boolean;
}) {
  const pathname = usePathname();
  const page = getPageMeta(pathname);
  const isSuperAdmin = user.platformRole === "super_admin";

  const shell = (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar
          variant="inset"
          className="sidebar-canvas border-r-0 text-sidebar-foreground"
        >
          <SidebarHeader className="px-4 py-5">
            {isSuperAdmin ? (
              <Link href="/platform" className="group block px-1 py-1">
                <BrandWordmark
                  label={brandLabel}
                  className="text-[1.05rem] font-medium text-sidebar-foreground"
                />
                <p className="mt-1.5 text-[0.68rem] leading-snug tracking-[0.12em] text-balance text-sidebar-foreground/55 uppercase">
                  Plattform
                </p>
              </Link>
            ) : (
              <TenantBrandHome brandLabel={brandLabel} />
            )}
          </SidebarHeader>

          <SidebarContent className="px-2">
            <SidebarGroup>
              <SidebarGroupLabel className="px-3 text-[0.68rem] tracking-[0.16em] text-sidebar-foreground/45 uppercase">
                {isSuperAdmin ? "Verwaltung" : "Funktionen"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {isSuperAdmin ? (
                  <SidebarNavItems
                    items={[platformNavItem]}
                    pathname={pathname}
                  />
                ) : (
                  <TenantFunctionNav pathname={pathname} />
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="space-y-3 border-t border-sidebar-border/80 p-4">
            <div className="rounded-none border border-sidebar-border/60 bg-white/5 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/55">
                {user.email}
              </p>
            </div>
            <SignOutButton />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <AreaContentInset
          page={page}
          isSuperAdmin={isSuperAdmin}
          showAreaSwitcher={!isSuperAdmin && allowedAreas.length > 0}
          dbConnected={dbConnected}
        >
          {children}
        </AreaContentInset>
      </SidebarProvider>
    </TooltipProvider>
  );

  if (isSuperAdmin) {
    return shell;
  }

  return (
    <ActiveAreaProvider
      initialActiveArea={initialActiveArea}
      allowedAreas={allowedAreas}
    >
      {shell}
    </ActiveAreaProvider>
  );
}

function AreaContentInset({
  children,
  page,
  isSuperAdmin,
  showAreaSwitcher,
  dbConnected,
}: {
  children: React.ReactNode;
  page: NavItem;
  isSuperAdmin: boolean;
  showAreaSwitcher: boolean;
  dbConnected: boolean;
}) {
  const areaCtx = useOptionalActiveArea();
  const activeArea = areaCtx?.activeArea ?? "all";
  const accentDot = isSuperAdmin
    ? page.href.startsWith("/platform")
      ? "bg-amber-400"
      : "bg-violet-400"
    : AREA_ACCENT_DOT[activeArea];

  return (
    <SidebarInset
      className={cn(
        "md:rounded-none transition-[background-image] duration-300",
        isSuperAdmin ? "content-canvas" : canvasClassForArea(activeArea)
      )}
    >
      <header className="sticky top-0 z-20 grid h-16 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border/50 bg-background/70 px-4 backdrop-blur-md md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="text-muted-foreground" />
          <Separator
            orientation="vertical"
            className="hidden h-4 sm:block"
          />
          <span
            className={cn(
              "hidden size-2 shrink-0 rounded-full sm:block",
              accentDot
            )}
          />
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-medium tracking-tight">
              {page.areaHref && page.areaLabel && page.pageLabel ? (
                <>
                  <Link
                    href={page.areaHref}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {page.areaLabel}
                  </Link>
                  <span className="text-muted-foreground/70"> / </span>
                  <span>{page.pageLabel}</span>
                </>
              ) : (
                page.label
              )}
            </p>
            {page.description ? (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {page.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="justify-self-center">
          {showAreaSwitcher ? <AreaSwitcher /> : null}
        </div>
        <div className="justify-self-end">
          <DbConnectionStatus connected={dbConnected} />
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-8 md:px-8 md:py-10">
        {children}
      </main>
    </SidebarInset>
  );
}

function TenantBrandHome({ brandLabel }: { brandLabel: string }) {
  const { activeArea, allowedAreas } = useActiveArea();
  const href =
    activeArea !== "all"
      ? areaBasePath(activeArea)
      : allowedAreas[0]
        ? areaBasePath(allowedAreas[0])
        : "/";

  return (
    <Link href={href} className="group block px-1 py-1">
      <BrandWordmark
        label={brandLabel}
        className="text-[1.05rem] font-medium text-sidebar-foreground"
      />
      <p className="mt-1.5 text-[0.68rem] leading-snug tracking-[0.12em] text-balance text-sidebar-foreground/55 uppercase">
        Kanzlei-Werkzeug
      </p>
    </Link>
  );
}

function TenantFunctionNav({ pathname }: { pathname: string }) {
  const { activeArea } = useActiveArea();
  return (
    <SidebarNavItems
      items={navigationForArea(activeArea)}
      pathname={pathname}
    />
  );
}

function SidebarNavItems({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const isAreaStart = /^\/[^/]+$/.test(item.href) && item.href !== "/";
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : isAreaStart
              ? pathname === item.href
              : pathname.startsWith(item.href);

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.label}
              className={cn(
                "h-10 rounded-full px-3 transition-colors",
                item.activeClass
              )}
            >
              <Link href={item.href}>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full",
                    isActive ? item.accent : "bg-white/5 text-inherit"
                  )}
                >
                  <item.icon className="size-3.5" />
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
