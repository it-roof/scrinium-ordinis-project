import { notFound, redirect } from "next/navigation";

import {
  isDesignConceptId,
} from "@/components/neues-design/concepts";
import { DesignLabClient } from "@/components/neues-design/design-lab-client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ concept: string }>;
};

export default async function DesignLabConceptPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { concept } = await params;
  if (!isDesignConceptId(concept)) {
    notFound();
  }

  return <DesignLabClient concept={concept} />;
}
