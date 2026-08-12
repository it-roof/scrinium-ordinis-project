"use client";

import { APP_MODULES, type AppModuleId } from "@/lib/modules";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type UserModulesFieldsProps = {
  /** Freigeschaltete Module der Kanzlei (Ceiling). */
  tenantModules: AppModuleId[];
  /** null = alle Tenant-Module; sonst Auswahl. */
  value: AppModuleId[] | null;
  onChange: (next: AppModuleId[] | null) => void;
};

export function UserModulesFields({
  tenantModules,
  value,
  onChange,
}: UserModulesFieldsProps) {
  const inheritAll = value === null;
  const available = APP_MODULES.filter((module) =>
    tenantModules.includes(module.id)
  );

  function toggle(id: AppModuleId, checked: boolean) {
    const current = value ?? [...tenantModules];
    if (checked) {
      onChange([...new Set([...current, id])]);
      return;
    }
    onChange(current.filter((item) => item !== id));
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <Label>Modul-Zugriff</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Welche Fachbereiche dieser Benutzer sehen darf. Höchstens die Module
          der Kanzlei.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 border border-border/70 px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={inheritAll}
          onChange={(event) => {
            if (event.target.checked) {
              onChange(null);
              return;
            }
            onChange([...tenantModules]);
          }}
          className="size-4 rounded-none"
        />
        <span>Alle Module der Kanzlei</span>
      </label>

      <div
        className={cn(
          "grid gap-2 sm:grid-cols-2",
          inheritAll && "pointer-events-none opacity-50"
        )}
      >
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Die Kanzlei hat noch keine Module freigeschaltet.
          </p>
        ) : (
          available.map((module) => {
            const checked = inheritAll || (value?.includes(module.id) ?? false);
            return (
              <label
                key={module.id}
                className="flex cursor-pointer items-center gap-2 border border-border/70 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={inheritAll}
                  onChange={(event) => toggle(module.id, event.target.checked)}
                  className="size-4 rounded-none"
                />
                <span>{module.label}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
