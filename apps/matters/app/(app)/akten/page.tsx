import { Suspense } from "react";

import { AktenGallery } from "@/components/matters/akten-gallery";

export default function AktenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Laden…
        </div>
      }
    >
      <AktenGallery />
    </Suspense>
  );
}
