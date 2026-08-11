import { getDepartmentLabel, type Department } from "@/lib/text-blocks/types";
import { departmentStyles } from "@/lib/text-blocks/department-styles";
import { cn } from "@/lib/utils";

export function DepartmentBadge({
  department,
  className,
}: {
  department: Department;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.68rem] font-medium tracking-wide uppercase ring-1 ring-inset",
        departmentStyles[department].badge,
        className
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", departmentStyles[department].dot)}
      />
      {getDepartmentLabel(department)}
    </span>
  );
}
