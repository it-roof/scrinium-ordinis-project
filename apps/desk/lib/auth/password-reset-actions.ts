"use server";

import {
  requestPasswordResetByEmail,
  requestPasswordResetForUser,
  resetPasswordWithToken,
} from "@/lib/auth/password-reset";
import { requireSessionUser } from "@/lib/tenant/session";

export async function requestPasswordResetAction(input: { email: string }) {
  return requestPasswordResetByEmail(input.email);
}

export async function requestMyPasswordResetLinkAction() {
  const user = await requireSessionUser();
  if (!user?.email) {
    return { success: false as const, error: "Nicht angemeldet." };
  }

  return requestPasswordResetForUser({
    id: user.id,
    email: user.email,
  });
}

export async function resetPasswordWithTokenAction(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return resetPasswordWithToken(input);
}
