"use client";

import { ChartNoAxesColumnIncreasingIcon, HeadphonesIcon } from "lucide-react";
import { SUPPORT_CONTACT } from "@scrinium/brand";

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function HeaderNavButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.68rem] tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function HeaderUtilityNav({ dbConnected }: { dbConnected: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-3 sm:gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <HeaderNavButton>
            <HeadphonesIcon className="size-3.5" aria-hidden />
            Support
          </HeaderNavButton>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 gap-3 rounded-none p-4">
          <PopoverHeader>
            <PopoverTitle>Support</PopoverTitle>
            <PopoverDescription>{SUPPORT_CONTACT.company}</PopoverDescription>
          </PopoverHeader>
          <div className="space-y-1.5 text-sm">
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
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <HeaderNavButton>
            <ChartNoAxesColumnIncreasingIcon
              className={cn(
                "size-3.5",
                dbConnected ? "text-emerald-500" : "text-red-500"
              )}
              aria-hidden
            />
            Status
          </HeaderNavButton>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 gap-3 rounded-none p-4">
          <PopoverHeader>
            <PopoverTitle>Status</PopoverTitle>
            <PopoverDescription>Systemzustand</PopoverDescription>
          </PopoverHeader>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                dbConnected ? "bg-emerald-500" : "bg-red-500"
              )}
              aria-hidden
            />
            <span>
              Datenbank{" "}
              {dbConnected ? (
                <span className="font-medium text-foreground">verbunden</span>
              ) : (
                <span className="font-medium text-foreground">offline</span>
              )}
            </span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
