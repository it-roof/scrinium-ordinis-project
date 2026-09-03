"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { StaffInboxSoundNotifier } from "@/components/inbox/staff-inbox-sound-notifier";
import {
  ActiveAreaProvider,
  useActiveArea,
  useOptionalActiveArea,
} from "@/components/layout/active-area-provider";
import { AreaSwitcher } from "@/components/layout/area-switcher";
import { HeaderUtilityNav } from "@/components/layout/header-utility-nav";
import { canvasClassForArea } from "@/lib/area/canvas";
import { areaBasePath, parseAreaFromPathname } from "@/lib/area/paths";
import { DESK_ROLE_LABELS } from "@/lib/area/desk-roles";
import { getPageMeta, platformNavItem, settingsNavItem, type NavItem } from "@/lib/navigation";
import {
  functionIdFromPathname,
  navigationGroupsForArea,
  type AreaFunctionId,
} from "@/lib/area/functions";
import { recordFunctionUse } from "@/lib/area/function-usage";
import type { ActiveArea } from "@/lib/area/active-area";
import type { AppModuleId } from "@/lib/modules";
import type { DeskRole, PlatformRole, UserRole } from "@/lib/db/schema";
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
  inboxCount = 0,
  allowedFunctions = null,
}: {
  children: React.ReactNode;
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role: UserRole;
    deskRole?: DeskRole | null;
    platformRole?: PlatformRole | null;
  };
  /** Anzeigename nach Login (Tenant brand_name oder Produktmarke). */
  brandLabel: string;
  allowedAreas: AppModuleId[];
  initialActiveArea: ActiveArea;
  dbConnected: boolean;
  inboxCount?: number;
  allowedFunctions?: AreaFunctionId[] | null;
}) {
  const pathname = usePathname();
  const page = getPageMeta(pathname);
  const isSuperAdmin = user.platformRole === "super_admin";

  useEffect(() => {
    if (!user.id || isSuperAdmin) {
      return;
    }
    const area = parseAreaFromPathname(pathname);
    const functionId = functionIdFromPathname(pathname);
    if (!area || !functionId) {
      return;
    }
    recordFunctionUse(user.id, area, functionId);
  }, [isSuperAdmin, pathname, user.id]);

  const shell = (
    <TooltipProvider>
      {!isSuperAdmin ? <StaffInboxSoundNotifier /> : null}
      <SidebarProvider
        className="sidebar-canvas"
        style={
          {
            // Featured Dashboard (shadcn dashboard-01): 18rem / 3rem
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <Sidebar
          variant="inset"
          className="text-sidebar-foreground"
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
            {isSuperAdmin ? (
              <SidebarGroup>
                <SidebarGroupLabel className="px-3 text-[0.68rem] tracking-[0.16em] text-sidebar-foreground/45 uppercase">
                  Verwaltung
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarNavItems
                    items={[platformNavItem]}
                    pathname={pathname}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              <TenantFunctionNav
                pathname={pathname}
                inboxCount={inboxCount}
                allowedFunctions={allowedFunctions}
                deskRole={user.deskRole ?? null}
              />
            )}
          </SidebarContent>

          <SidebarFooter className="space-y-3 border-t border-sidebar-border/80 p-4">
            <div className="rounded-none border border-sidebar-border/60 bg-white/5 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/55">
                {user.email}
              </p>
              {user.deskRole ? (
                <p className="mt-1 truncate text-xs text-sidebar-foreground/70">
                  {DESK_ROLE_LABELS[user.deskRole]}
                </p>
              ) : null}
            </div>
            {!isSuperAdmin ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/einstellungen")}
                    tooltip={settingsNavItem.label}
                    className={cn(
                      "h-10 rounded-full px-3 transition-colors",
                      settingsNavItem.activeClass
                    )}
                  >
                    <Link href="/einstellungen">
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full",
                          pathname.startsWith("/einstellungen")
                            ? settingsNavItem.accent
                            : "bg-white/5 text-inherit"
                        )}
                      >
                        <settingsNavItem.icon className="size-3.5" />
                      </span>
                      <span className="font-medium">{settingsNavItem.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : null}
            <SignOutButton />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <AreaContentInset
          page={page}
          isSuperAdmin={isSuperAdmin}
          showAreaSwitcher={!isSuperAdmin && allowedAreas.length > 1}
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

  return (
    <SidebarInset
      className={cn(
        "transition-[background-image] duration-300",
        "md:m-2 md:ml-0 md:overflow-hidden md:rounded-[0.75rem] md:shadow-sm",
        "md:peer-data-[state=collapsed]:ml-2",
        isSuperAdmin ? "content-canvas" : canvasClassForArea(activeArea)
      )}
    >
      <header className="sticky top-0 z-20 grid h-(--header-height) shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border/50 bg-background/95 px-4 md:rounded-t-[0.75rem] md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger
            className="size-8 shrink-0 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label="Seitenleiste ein- oder ausklappen"
          />
          <Separator
            orientation="vertical"
            className="mx-1 hidden h-5! self-center data-vertical:h-5! data-vertical:self-center sm:block"
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
          <HeaderUtilityNav dbConnected={dbConnected} />
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

function TenantFunctionNav({
  pathname,
  inboxCount,
  allowedFunctions,
  deskRole,
}: {
  pathname: string;
  inboxCount: number;
  allowedFunctions: AreaFunctionId[] | null;
  deskRole: DeskRole | null;
}) {
  const { activeArea } = useActiveArea();
  const groups = navigationGroupsForArea(
    activeArea,
    allowedFunctions,
    deskRole
  );

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label || "pinned"}>
          {group.label ? (
            <SidebarGroupLabel className="px-3 text-[0.68rem] tracking-[0.16em] text-sidebar-foreground/45 uppercase">
              {group.label}
            </SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarNavItems
              items={group.items}
              pathname={pathname}
              inboxCount={inboxCount}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function isInboxNavHref(href: string) {
  return href === "/eingang" || href.endsWith("/eingang");
}

function SidebarNavItems({
  items,
  pathname,
  inboxCount = 0,
}: {
  items: NavItem[];
  pathname: string;
  inboxCount?: number;
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
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
        const showInboxCount = isInboxNavHref(item.href) && inboxCount > 0;

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={
                showInboxCount
                  ? `${item.label} (${inboxCount})`
                  : item.label
              }
              className={cn(
                "h-10 rounded-full px-3 transition-colors",
                item.activeClass
              )}
            >
              <Link href={item.href} className="w-full">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    isActive ? item.accent : "bg-white/5 text-inherit"
                  )}
                >
                  <item.icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {item.label}
                </span>
                {showInboxCount ? (
                  <div
                    className={cn(
                      "ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.68rem] font-semibold tabular-nums",
                      isActive
                        ? "bg-amber-400/30 text-amber-50"
                        : "bg-amber-400/20 text-amber-100/90"
                    )}
                  >
                    {inboxCount}
                  </div>
                ) : null}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
