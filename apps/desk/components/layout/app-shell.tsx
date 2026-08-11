"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { getPageMeta, navigation } from "@/lib/navigation";
import { KANZLEI_NAME } from "@/lib/brand";
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

const practiceAreas = [
  { label: "Steuer", color: "bg-sky-400" },
  { label: "Recht", color: "bg-indigo-400" },
  { label: "Sanierung", color: "bg-amber-400" },
  { label: "Beratung", color: "bg-teal-400" },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    role: "admin" | "employee";
  };
}) {
  const pathname = usePathname();
  const page = getPageMeta(pathname);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar
          variant="inset"
          className="sidebar-canvas border-r-0 text-sidebar-foreground"
        >
          <SidebarHeader className="px-4 py-5">
            <Link href="/" className="group block px-1 py-1">
              <BrandWordmark
                className="text-[1.2rem] font-medium text-sidebar-foreground"
                periodClassName="text-sidebar-primary"
              />
              <p className="mt-1.5 text-[0.68rem] leading-snug tracking-[0.12em] text-balance text-sidebar-foreground/55 uppercase">
                {KANZLEI_NAME}
              </p>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-2">
            <SidebarGroup>
              <SidebarGroupLabel className="px-3 text-[0.68rem] tracking-[0.16em] text-sidebar-foreground/45 uppercase">
                Bereiche
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
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
            <div className="flex flex-wrap gap-1.5">
              {practiceAreas.map((area) => (
                <span
                  key={area.label}
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[0.62rem] text-sidebar-foreground/60"
                >
                  <span className={cn("size-1.5 rounded-full", area.color)} />
                  {area.label}
                </span>
              ))}
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="content-canvas md:rounded-none">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border/50 bg-background/70 px-4 backdrop-blur-md md:px-8">
            <SidebarTrigger className="text-muted-foreground" />
            <Separator
              orientation="vertical"
              className="hidden h-4 sm:block"
            />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className={cn(
                  "hidden size-2 shrink-0 rounded-full sm:block",
                  page.href === "/"
                    ? "bg-violet-400"
                    : "bg-sky-400"
                )}
              />
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-medium tracking-tight">
                  {page.label}
                </p>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {page.description}
                </p>
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col px-4 py-8 md:px-8 md:py-10">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
