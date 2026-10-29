import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MatterProject } from "@/components/matters/matter-project";
import { getMatterDetailAction, listStaffAction } from "@/lib/matters/actions";
import { listMatterFilesAction } from "@/lib/matters/files-actions";
import { listMatterLettersAction } from "@/lib/letters/actions";

async function MatterView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [matter, staff, filesResult, lettersResult] = await Promise.all([
    getMatterDetailAction(id),
    listStaffAction(),
    listMatterFilesAction(id),
    listMatterLettersAction(id),
  ]);
  if (!matter) notFound();
  return (
    <MatterProject
      initial={matter}
      staff={staff}
      initialFiles={filesResult.success ? filesResult.data : []}
      initialLetters={lettersResult.success ? lettersResult.data : []}
    />
  );
}

export default function MatterPage({
  params,
}: PageProps<"/akten/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Laden…
        </div>
      }
    >
      <MatterView params={params} />
    </Suspense>
  );
}
