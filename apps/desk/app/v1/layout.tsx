import { redirect } from "next/navigation";

import { TooltipProvider } from "@/components/v1/ui/tooltip";
import { Toaster } from "@/components/v1/ui/sonner";
import { auth } from "@/lib/auth";

import "./v1-theme.css";

/**
 * Isoliertes v1-Shell mit shadcn new-york-v4 Theme.
 * Bestehende Desk-Routen unter (main) bleiben unverändert.
 */
export default async function V1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <TooltipProvider>
      <div className="v1-shell fixed inset-0 z-50 flex flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
