"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRightIcon, FileTextIcon, FolderIcon } from "lucide-react";

import { DepartmentBadge } from "@/components/text-blocks/department-badge";
import type { DocPageTreeNode } from "@/lib/docs/types";
import type { Department } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type DocSidebarProps = {
  tree: DocPageTreeNode[];
  activeSlug?: string;
  departmentFilter: Department | "all";
};

export function DocSidebar({
  tree,
  activeSlug,
  departmentFilter,
}: DocSidebarProps) {
  const filteredTree = useMemo(() => {
    if (departmentFilter === "all") return tree;

    return tree
      .map((node) => ({
        ...node,
        children: node.children.filter(
          (child) => child.department === departmentFilter
        ),
      }))
      .filter(
        (node) =>
          node.department === departmentFilter || node.children.length > 0
      );
  }, [departmentFilter, tree]);

  return (
    <nav className="space-y-1">
      {filteredTree.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted-foreground">
          Noch keine Seiten in diesem Bereich.
        </p>
      ) : (
        filteredTree.map((node) => (
          <div key={node.id} className="space-y-1">
            <SidebarLink
              href={`/dokumentation/${node.slug}`}
              active={activeSlug === node.slug}
              icon={node.children.length > 0 ? FolderIcon : FileTextIcon}
              label={node.title}
              department={node.department}
            />
            {node.children.length > 0 && (
              <div className="ml-3 space-y-1 border-l border-border/70 pl-2">
                {node.children.map((child) => (
                  <SidebarLink
                    key={child.id}
                    href={`/dokumentation/${child.slug}`}
                    active={activeSlug === child.slug}
                    icon={FileTextIcon}
                    label={child.title}
                    department={child.department}
                    nested
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </nav>
  );
}

function SidebarLink({
  href,
  active,
  icon: Icon,
  label,
  department,
  nested = false,
}: {
  href: string;
  active: boolean;
  icon: typeof FileTextIcon;
  label: string;
  department: Department;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_oklch(0.55_0.15_290/0.18)]"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        nested && "text-[0.92rem]"
      )}
    >
      <Icon className="size-4 shrink-0 opacity-70" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!nested && (
        <DepartmentBadge department={department} className="hidden xl:inline-flex" />
      )}
      <ChevronRightIcon className="size-3.5 shrink-0 opacity-40" />
    </Link>
  );
}
