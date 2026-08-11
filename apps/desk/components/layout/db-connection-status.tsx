import { cn } from "@/lib/utils";

export function DbConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-2"
      title={
        connected
          ? "Datenbankverbindung erfolgreich"
          : "Datenbank nicht erreichbar"
      }
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          connected ? "bg-emerald-500" : "bg-red-500"
        )}
        aria-hidden
      />
      <p className="hidden text-[0.68rem] tracking-[0.06em] text-muted-foreground uppercase sm:block">
        DB {connected ? "verbunden" : "offline"}
      </p>
    </div>
  );
}
