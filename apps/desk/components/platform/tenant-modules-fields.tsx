"use client";

import { APP_MODULES, type AppModuleId } from "@/lib/modules";
import { Label } from "@/components/ui/label";

export function TenantModulesFields({
  value,
  onChange,
}: {
  value: AppModuleId[];
  onChange: (next: AppModuleId[]) => void;
}) {
  function toggle(id: AppModuleId, checked: boolean) {
    if (checked) {
      onChange([...new Set([...value, id])]);
      return;
    }
    onChange(value.filter((item) => item !== id));
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <Label>Module</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Fachgebiete dieser Kanzlei. Textbausteine, Prompt und Dokumentation
          nutzen diese Module als Bereiche.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {APP_MODULES.map((module) => {
          const checked = value.includes(module.id);
          return (
            <label
              key={module.id}
              className="flex cursor-pointer items-center gap-2 border border-border/70 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => toggle(module.id, event.target.checked)}
                className="size-4 rounded-none"
              />
              <span>{module.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
