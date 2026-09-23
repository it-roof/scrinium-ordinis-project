import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { TooltipProvider } from "@/components/desk/ui/tooltip";
import { Toaster } from "@/components/desk/ui/sonner";
import { auth } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/tenant/session";

import "./desk-theme.css";

/**
 * Haupt-App-Shell. Route-group (main) — URLs ohne Prefix.
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const isSuperAdmin = isPlatformSuperAdmin(session.user);

  if (isSuperAdmin && !pathname.startsWith("/platform")) {
    redirect("/platform");
  }

  if (!isSuperAdmin && pathname.startsWith("/platform")) {
    redirect("/dashboard");
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
