import { connection } from "next/server";
import { Suspense } from "react";

import { MattersShell } from "@/components/app/matters-shell";
import { listChatsAction } from "@/lib/chat/actions";
import { listMattersAction } from "@/lib/matters/actions";
import { requireTenantUser } from "@/lib/tenant/session";

async function AppFrame({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await requireTenantUser();
  const [chats, matters] = await Promise.all([
    listChatsAction(),
    listMattersAction(),
  ]);

  return (
    <MattersShell
      userName={user.name?.trim() || "Ohne Name"}
      userEmail={user.email ?? null}
      initialChats={chats}
      initialMatters={matters}
    >
      {children}
    </MattersShell>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
          <p className="text-sm">Laden…</p>
        </div>
      }
    >
      <AppFrame>{children}</AppFrame>
    </Suspense>
  );
}
