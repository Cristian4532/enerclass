import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import type { Role, SessionUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    position: user.position
  };

  return <AppShell user={sessionUser}>{children}</AppShell>;
}
