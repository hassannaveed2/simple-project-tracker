import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { EntranceAnimation } from "@/components/layout/entrance-animation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  // Read fresh from the database rather than trusting the JWT session claims, since updateProfile
  // can change `name` without the session token refreshing (same reasoning as the Settings page).
  // The JWT itself stays validly-signed even if its user was later deleted (e.g. a database
  // reset) — treat a missing row as an expired session rather than crashing.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });
  if (!user) redirect("/auth/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <EntranceAnimation />
      <Sidebar />
      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <div className="flex items-center gap-3 md:hidden">
            <MobileNav />
            <span className="font-semibold">Task Tracker</span>
          </div>
          <ProfileMenu user={user} className="ml-auto" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
