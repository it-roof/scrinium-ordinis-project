"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { FileTextIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteDocAsset, getDocAssets } from "@/lib/docs/actions";
import {
  extractAssetIdsFromMarkdown,
  removeAssetFromMarkdown,
} from "@/lib/docs/asset-markdown";
import type { DocAsset } from "@/lib/docs/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DocEmbeddedAssetsProps = {
  content: string;
  pageId?: string;
  onContentChange: (content: string) => void;
};

export function DocEmbeddedAssets({
  content,
  pageId,
  onContentChange,
}: DocEmbeddedAssetsProps) {
  const assetIds = useMemo(() => extractAssetIdsFromMarkdown(content), [content]);
  const [assets, setAssets] = useState<DocAsset[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DocAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (assetIds.length === 0) {
      setAssets([]);
      return;
    }

    let cancelled = false;

    setIsLoading(true);

    getDocAssets(assetIds).then((result) => {
      if (cancelled) return;

      if (result.success) {
        setAssets(result.assets);
      } else {
        setAssets([]);
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [assetIds.join(",")]);

  const sortedAssets = useMemo(() => {
    const order = new Map(assetIds.map((id, index) => [id, index]));

    return [...assets].sort(
      (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)
    );
  }, [assetIds, assets]);

  if (assetIds.length === 0) {
    return null;
  }

  function handleDelete() {
    if (!deleteTarget) return;

    const target = deleteTarget;

    startTransition(async () => {
      const result = await deleteDocAsset(target.id, pageId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onContentChange(removeAssetFromMarkdown(content, target.id));
      setAssets((current) => current.filter((asset) => asset.id !== target.id));
      setDeleteTarget(null);
      toast.success("Datei gelöscht und aus dem Text entfernt.");
    });
  }

  return (
    <>
      <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Eingebettete Dateien</p>
          {isLoading && (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {sortedAssets.map((asset) => {
            const isImage = asset.mimeType.startsWith("image/");

            return (
              <div
                key={asset.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-3"
              >
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/40">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/docs/files/${asset.id}`}
                      alt={asset.filename}
                      className="size-full object-cover"
                    />
                  ) : (
                    <FileTextIcon className="size-5 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{asset.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {isImage ? "Bild" : "PDF"}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(asset)}
                  aria-label={`${asset.filename} löschen`}
                >
                  <Trash2Icon />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              Datei löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTarget?.filename}" wird aus dem Storage entfernt und der
              Verweis im Text gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
