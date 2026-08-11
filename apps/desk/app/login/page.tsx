import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="content-canvas flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <LoginForm />
    </div>
  );
}
