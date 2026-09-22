import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProfileForm } from "@/components/settings/profile-form";
import { ThemeSelect } from "@/components/settings/theme-select";
import { PasswordForm } from "@/components/settings/password-form";
import { LogoutButton } from "@/components/settings/logout-button";
import { ExportDataButton } from "@/components/settings/export-data-button";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export default async function SettingsPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  // Read the user's current name/email fresh from the database rather than trusting the JWT
  // session claims, since updateProfile can change `name` without the session token refreshing.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Profile</h2>
        <ProfileForm name={user.name ?? ""} email={user.email} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Theme</h2>
        <ThemeSelect />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Account</h2>
        <PasswordForm />
        <LogoutButton />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Data Management</h2>
        <div className="flex flex-wrap gap-3">
          <ExportDataButton />
          <DeleteAccountDialog />
        </div>
      </section>
    </div>
  );
}
