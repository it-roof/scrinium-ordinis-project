import type { ContentModule, DeskRole } from "@/lib/db/schema";

export type ChatPractice = Extract<ContentModule, "legal" | "tax">;

export function practiceForDeskRole(role: DeskRole | null): ChatPractice {
  if (role === "steuerberater" || role === "stb_sekretariat") {
    return "tax";
  }
  return "legal";
}
